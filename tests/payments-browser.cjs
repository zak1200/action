/* Real local PHP/SQLite endpoints; Stripe transport is a synthetic fixture, not a sandbox payment. */
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { expect } = require((process.env.PLAYWRIGHT_PATH || 'playwright') + '/test');
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os');
const { spawn, spawnSync } = require('node:child_process');
const { randomBytes, createHmac } = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), php = process.env.PHP_PATH || 'php';
const port = 4200 + require('node:crypto').randomInt(1000);
const url = `http://127.0.0.1:${port}`, output = path.resolve(process.env.ARTIFACT_DIR || 'test-results/payments');
(async () => {
  const privateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'action-http-tests-')); await fs.mkdir(output, { recursive: true });
  const config = { enabled: true, mode: 'test', base_url: url, app_secret: randomBytes(32).toString('hex'), stripe_secret: 'rk_test_' + 'x'.repeat(24), stripe_webhook_secret: 'whsec_fixture', admin_email: 'agenceassistance3@gmail.com', notification_email: 'agenceassistance3@gmail.com', sender_email: 'contact@action-etranger.fr', smtp_host: '127.0.0.1', smtp_port: 1, smtp_user: 'fixture', smtp_password: 'fixture', lead_minutes: 60, terms_version: 'test' };
  await fs.writeFile(path.join(privateDir, 'config.php'), `<?php return json_decode(base64_decode('${Buffer.from(JSON.stringify(config)).toString('base64')}'),true);`);
  const env = { ...process.env, ACTION_PRIVATE_DIR: privateDir };
  const server = spawn(php, ['-d', `auto_prepend_file=${path.join(__dirname, 'http-fixture.php')}`, '-S', `127.0.0.1:${port}`, '-t', root], { cwd: root, env, windowsHide: true, stdio: 'ignore' });
  const report = { checks: [], screenshots: [], accessibility: [] }, errors = [];
  let browser;
  const check = (label, value) => { assert.ok(value, label); report.checks.push(label); };
  try {
    for (let i = 0; i < 50; i++) {
      const ready = await new Promise(resolve => require('node:http').get(url, response => { response.resume(); resolve(response.statusCode === 200); }).on('error', () => resolve(false)));
      if (ready) break; await new Promise(r => setTimeout(r, 100));
    }
    browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Europe/Paris' });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.route('https://checkout.stripe.com/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Synthetic checkout transport</h1>' }));
    await page.goto(url); await expect(page.locator('.demo-bar')).toContainText('Version de test');
    check('Six service cards preserved', await page.locator('.service-card').count() === 6);
    check('No third-party embeds before click', await page.locator('iframe').count() === 0);
    check('Unauthenticated admin API rejects access', (await context.request.get(url + '/api/index.php?action=admin-bookings')).status() === 401);
    check('Mutation without CSRF rejected', (await context.request.post(url + '/api/index.php?action=checkout', { data: {} })).status() === 403);
    for (const width of [1440,1024,768,390,375]) {
      await page.setViewportSize({ width, height: 1000 });
      check(`Homepage fits ${width}px`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if ([1440,390].includes(width)) { const name = `homepage-${width}.png`; await page.screenshot({ path: path.join(output,name), fullPage:true }); report.screenshots.push(name); }
      await page.locator('.hero [data-book]').click(); await expect(page.locator('#booking-form [type=submit]')).toBeEnabled();
      check(`Booking dialog fits ${width}px`, await page.locator('#booking-dialog').evaluate(el => el.scrollWidth <= el.clientWidth));
      check(`Phone required at ${width}px`, await page.locator('[name=phone]').getAttribute('required') !== null);
      if ([1440,390].includes(width)) { const name = `booking-${width}.png`; await page.screenshot({ path: path.join(output,name) }); report.screenshots.push(name); }
      if (process.env.AXE_PATH && [1440,390].includes(width)) { const Axe = require(process.env.AXE_PATH).default; const results = await new Axe({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze(); report.accessibility.push({ width, violations: results.violations }); check(`Booking accessibility ${width}px`, results.violations.length === 0); }
      await page.keyboard.press('Escape');
    }
    await page.setViewportSize({ width:1440,height:1000 });
    await page.locator('.service-card button').first().click(); await page.getByRole('button',{name:'Parler de cette démarche'}).click();
    await expect(page.locator('#booking-service')).toHaveValue('Titre de séjour');
    const next = new Date(); next.setUTCDate(next.getUTCDate()+3); while ([0,6].includes(next.getUTCDay())) next.setUTCDate(next.getUTCDate()+1); const day=next.toISOString().slice(0,10);
    await page.locator('#booking-date').fill(day); await expect(page.locator('#booking-time')).toBeEnabled();
    await page.locator('#booking-time').selectOption('10:00'); await page.locator('[name=name]').fill('Camille Test'); await page.locator('[name=email]').fill('camille@example.com');
    await page.locator('[name=phone]').fill('06 12 34 56 78'); await page.locator('textarea[name=description]').fill('<img src=x onerror=alert(1)>'); await page.locator('[name=consent]').check();
    const createResponse = page.waitForResponse(r=>r.url().includes('action=checkout'));
    await page.locator('#booking-form [type=submit]').click(); const created = await (await createResponse).json();
    check('Checkout API creates pending appointment', created.status === 'pending' && created.url.startsWith('https://checkout.stripe.com/'));
    await page.waitForURL('https://checkout.stripe.com/**');
    const unavailable = await (await context.request.get(url+'/api/index.php?action=availability&date='+day)).json(); check('Persisted slot removed from API availability', !unavailable.times.includes('10:00'));
    const state=await (await context.request.get(url+'/api/index.php?action=session')).json();
    const denied=await context.request.post(url+'/api/index.php?action=checkout',{headers:{Origin:url,'X-CSRF-Token':state.csrf},data:{name:'Other Test',email:'other@example.com',phone:'0612345678',service:'Titre de séjour',description:'',date:day,time:'10:00',consent:true,request_key:randomBytes(20).toString('hex')}});
    check('Duplicate slot rejected through HTTP',denied.status()===409);
    check('Booking status requires private token',(await context.request.get(url+'/api/index.php?action=booking&id='+created.booking_id)).status()===404);
    const fixturePath=path.join(privateDir,'stripe-fixture.json'), fixture=JSON.parse(await fs.readFile(fixturePath,'utf8')), sessionId=Object.keys(fixture)[0];
    fixture[sessionId].status='complete';fixture[sessionId].payment_status='paid'; await fs.writeFile(fixturePath,JSON.stringify(fixture));
    const raw=JSON.stringify({id:'evt_browser_confirm',object:'event',livemode:false,type:'checkout.session.completed',data:{object:fixture[sessionId]}}), timestamp=Math.floor(Date.now()/1000);
    const signature=`t=${timestamp},v1=${createHmac('sha256',config.stripe_webhook_secret).update(`${timestamp}.${raw}`).digest('hex')}`;
    check('Unsigned webhook rejected',(await context.request.post(url+'/api/index.php?action=webhook',{data:raw})).status()===400);
    check('Signed webhook confirms payment',(await context.request.post(url+'/api/index.php?action=webhook',{headers:{'Stripe-Signature':signature,'Content-Type':'application/json'},data:raw})).status()===200);
    await page.goto(url+'/?booking='+created.booking_id+'#reservation'); await expect(page.locator('#booking-success h2')).toHaveText('Votre rendez-vous est confirmé.');
    await page.keyboard.press('Escape'); await page.goto(url+'/#admin'); await expect(page.locator('#admin-login')).toBeVisible();
    check('No personal information before login',await page.locator('.booking-record').count()===0);
    const cookie=(await context.cookies(url)).find(c=>c.name==='action_booking');
    const seed=spawnSync(php,[path.join(__dirname,'seed-login.php'),cookie.value],{env,windowsHide:true,encoding:'utf8'}); assert.equal(seed.status,0,seed.stderr);
    const login=await (await context.request.post(url+'/api/index.php?action=login-verify',{headers:{Origin:url,'X-CSRF-Token':state.csrf},data:{code:'12345678'}})).json(); check('Admin OTP login via API',login.authenticated);
    await page.reload(); await expect(page.locator('.booking-record')).toHaveCount(1);
    await page.locator('.booking-record summary').click(); check('Description rendered safely as text',await page.locator('.booking-record img').count()===0); await expect(page.locator('.booking-record')).toContainText('<img src=x onerror=alert(1)>');
    check('Phone and payment visible to admin',(await page.locator('.booking-record').innerText()).includes('0612345678')&&(await page.locator('.booking-record').innerText()).includes('Payé · 10 €'));
    for(const width of [1440,1024,768,390,375]){await page.setViewportSize({width,height:1000});check(`Admin fits ${width}px`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if([1440,390].includes(width)){const name=`admin-${width}.png`;await page.screenshot({path:path.join(output,name),fullPage:true});report.screenshots.push(name);}}
    if(process.env.AXE_PATH){const Axe=require(process.env.AXE_PATH).default;const result=await new Axe({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();report.accessibility.push({screen:'admin',violations:result.violations});check('Admin accessibility',result.violations.length===0);}
    await page.locator('#admin-logout').click();await expect(page.locator('#admin-login')).toBeVisible();check('Logout removes private appointments',await page.locator('.booking-record').count()===0);
    check('No browser JavaScript errors',errors.length===0);
    report.passed=report.checks.length;
  } finally { if(browser)await browser.close();server.kill();await fs.writeFile(path.join(output,'report.json'),JSON.stringify({...report,errors},null,2)); }
  console.log(JSON.stringify({passed:report.passed,output,screenshots:report.screenshots}));
})().catch(error=>{console.error(error);process.exitCode=1;});

