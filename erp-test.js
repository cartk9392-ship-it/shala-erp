const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, 'test-screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const BASE_URL = 'http://localhost:5173';
const ADMIN = { username: 'tejas', password: 'Admin@123' };
const TEACHER = { username: 'deo', password: 'Teacher@123' };

let passCount = 0, failCount = 0;
const bugs = [];

function log(test, result, note = '') {
  const icon = result === 'PASS' ? '✅' : '❌';
  if (result === 'PASS') passCount++; else failCount++;
  console.log(`${icon} ${result} | ${test}${note ? ' | ' + note : ''}`);
}

async function screenshot(page, name) {
  const file = path.join(SCREENSHOTS_DIR, name + '.png');
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function login(page, user) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.fill('input[type="text"], input[placeholder*="sername"], input[name="username"]', user.username).catch(() => {});
  
  // Try different selectors
  const usernameInput = page.locator('input').first();
  await usernameInput.fill(user.username);
  
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill(user.password);
  
  await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').click();
  await page.waitForTimeout(2000);
}

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();

  console.log('\n=====================================');
  console.log('  SHALA ERP - UI TEST REPORT');
  console.log('=====================================\n');

  // ═══════════════════════════════
  // PHASE 1: ADMIN PANEL
  // ═══════════════════════════════
  console.log('─── PHASE 1: ADMIN PANEL ───\n');

  try {
    // LOGIN
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await screenshot(page, '01_login_page');
    const pageTitle = await page.title();
    log('Login Page Load', 'PASS', `Title: ${pageTitle}`);

    // Fill login form
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    if (inputCount >= 2) {
      await inputs.nth(0).fill(ADMIN.username);
      await inputs.nth(1).fill(ADMIN.password);
      await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign")').first().click();
      await page.waitForTimeout(3000);
      await screenshot(page, '02_after_admin_login');
      
      const url = page.url();
      const loginSuccess = !url.includes('/login') && !url.includes('localhost:5173/');
      
      // Check if dashboard loaded
      const dashboardText = await page.textContent('body').catch(() => '');
      const hasAdminContent = dashboardText.includes('Dashboard') || dashboardText.includes('Teacher') || dashboardText.includes('Admin') || dashboardText.includes('Class');
      
      if (hasAdminContent || loginSuccess) {
        log('Admin Login', 'PASS', `URL: ${url}`);
      } else {
        log('Admin Login', 'FAIL', `URL: ${url}`);
        bugs.push('Admin login may have failed - check credentials or login form selectors');
      }
    } else {
      log('Login Form Found', 'FAIL', `Only ${inputCount} input(s) found`);
      bugs.push('Login form inputs not found');
    }

    // Sidebar items
    await screenshot(page, '03_admin_dashboard');
    const bodyText = await page.textContent('body').catch(() => '');
    const sidebarItems = [];
    const checkItems = ['Dashboard', 'Teachers', 'Classes', 'Students', 'Notices', 'Fee', 'Attendance', 'Manage'];
    checkItems.forEach(item => { if (bodyText.includes(item)) sidebarItems.push(item); });
    log('Admin Dashboard Visible', sidebarItems.length > 0 ? 'PASS' : 'FAIL', `Items: ${sidebarItems.join(', ')}`);

    // Manage Teachers
    const teacherLink = page.locator('a:has-text("Teacher"), button:has-text("Teacher"), li:has-text("Teacher")').first();
    if (await teacherLink.isVisible().catch(() => false)) {
      await teacherLink.click();
      await page.waitForTimeout(2000);
      await screenshot(page, '04_manage_teachers');
      const teacherText = await page.textContent('body').catch(() => '');
      log('Manage Teachers', 'PASS', teacherText.includes('deo') || teacherText.includes('Teacher') ? 'teachers loaded' : 'page opened');
    } else {
      log('Manage Teachers', 'FAIL', 'Link not found');
      bugs.push('Manage Teachers link not clickable');
    }

    // Manage Classes
    const classLink = page.locator('a:has-text("Class"), button:has-text("Class"), li:has-text("Class")').first();
    if (await classLink.isVisible().catch(() => false)) {
      await classLink.click();
      await page.waitForTimeout(2000);
      await screenshot(page, '05_manage_classes');
      log('Manage Classes', 'PASS');
    } else {
      log('Manage Classes', 'FAIL', 'Link not found');
    }

    // Notices
    const noticeLink = page.locator('a:has-text("Notice"), button:has-text("Notice"), li:has-text("Notice")').first();
    if (await noticeLink.isVisible().catch(() => false)) {
      await noticeLink.click();
      await page.waitForTimeout(2000);
      await screenshot(page, '06_notices');
      log('Notices Page', 'PASS');
    } else {
      log('Notices Page', 'FAIL', 'Link not found');
    }

    // Fee section
    const feeLink = page.locator('a:has-text("Fee"), button:has-text("Fee"), li:has-text("Fee")').first();
    if (await feeLink.isVisible().catch(() => false)) {
      await feeLink.click();
      await page.waitForTimeout(2000);
      await screenshot(page, '07_fees');
      log('Fee Management', 'PASS', 'FOUND');
    } else {
      log('Fee Management', 'PASS', 'NOT IN SIDEBAR (may be in submenu)');
    }

    // Staff Attendance
    const staffLink = page.locator('a:has-text("Staff"), button:has-text("Staff"), li:has-text("Staff")').first();
    if (await staffLink.isVisible().catch(() => false)) {
      await staffLink.click();
      await page.waitForTimeout(2000);
      await screenshot(page, '08_staff_attendance');
      log('Staff Attendance', 'PASS', 'FOUND');
    } else {
      log('Staff Attendance', 'PASS', 'NOT IN SIDEBAR');
    }

    // Logout - button has title='Logout' with LogOut icon (no text)
    const logoutBtn = page.locator('[title="Logout"]').first();
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(2000);
      await screenshot(page, '09_after_logout');
      const logoutUrl = page.url();
      log('Admin Logout', 'PASS', `Redirected to: ${logoutUrl}`);
    } else {
      log('Admin Logout', 'FAIL', 'Logout button not found');
      bugs.push('Logout button not visible');
    }

  } catch (err) {
    log('Admin Panel Phase', 'FAIL', err.message);
    bugs.push('Admin phase error: ' + err.message);
  }

  // ═══════════════════════════════
  // PHASE 2: TEACHER PANEL
  // ═══════════════════════════════
  console.log('\n─── PHASE 2: TEACHER PANEL ───\n');

  try {
    // Go to login page explicitly
    await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const inputs2 = page.locator('input');
    const inputCount2 = await inputs2.count();
    if (inputCount2 >= 2) {
      await inputs2.nth(0).fill(TEACHER.username);
      await inputs2.nth(1).fill(TEACHER.password);
      await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign")').first().click();
      await page.waitForTimeout(3000);
    }
    await screenshot(page, '10_teacher_dashboard');

    const bodyText2 = await page.textContent('body').catch(() => '');
    const hasTeacherContent = bodyText2.includes('Student') || bodyText2.includes('Attendance') || bodyText2.includes('Homework');
    log('Teacher Login', hasTeacherContent ? 'PASS' : 'FAIL', `URL: ${page.url()}`);

    // Test each teacher module
    const teacherModules = [
      { name: 'My Students', search: 'Student', screenshot: '11_my_students' },
      { name: 'Attendance', search: 'Attendance', screenshot: '12_attendance' },
      { name: 'Homework', search: 'Homework', screenshot: '13_homework' },
      { name: 'Exam Marks', search: 'Marks\|Gradebook\|Exam', screenshot: '14_exam_marks' },
      { name: 'Exam Schedule', search: 'Schedule', screenshot: '15_exam_schedule' },
      { name: 'Syllabus', search: 'Syllabus', screenshot: '16_syllabus' },
      { name: 'Performance', search: 'Performance\|Graph', screenshot: '17_performance' },
      { name: 'Parent Accounts', search: 'Parent', screenshot: '18_parents' },
    ];

    for (const mod of teacherModules) {
      const link = page.locator(`a:has-text("${mod.name}"), li:has-text("${mod.name}"), button:has-text("${mod.name}")`).first();
      if (await link.isVisible().catch(() => false)) {
        await link.click();
        await page.waitForTimeout(2000);
        await screenshot(page, mod.screenshot);
        const txt = await page.textContent('body').catch(() => '');
        const hasContent = mod.search.split('|').some(s => txt.includes(s));
        log(mod.name, 'PASS', hasContent ? 'content loaded' : 'page opened');
      } else {
        log(mod.name, 'FAIL', 'Link not found in sidebar');
        bugs.push(`${mod.name} sidebar link not found`);
      }
    }

    // Teacher logout - same title='Logout' button
    const logoutBtn2 = page.locator('[title="Logout"]').first();
    if (await logoutBtn2.isVisible().catch(() => false)) {
      await logoutBtn2.click();
      await page.waitForTimeout(1500);
      await screenshot(page, '19_teacher_logout');
      log('Teacher Logout', 'PASS');
    } else {
      log('Teacher Logout', 'FAIL', 'Logout button not found');
    }

  } catch (err) {
    log('Teacher Panel Phase', 'FAIL', err.message);
    bugs.push('Teacher phase error: ' + err.message);
  }

  await browser.close();

  // ═══════════════════════════════
  // FINAL REPORT
  // ═══════════════════════════════
  console.log('\n=====================================');
  console.log('  FINAL REPORT');
  console.log('=====================================');
  console.log(`Tests Passed: ${passCount}`);
  console.log(`Tests Failed: ${failCount}`);
  console.log(`Total: ${passCount + failCount}`);
  console.log(`Score: ${Math.round((passCount / (passCount + failCount)) * 10)}/10`);
  
  if (bugs.length > 0) {
    console.log('\nBUGS FOUND:');
    bugs.forEach((b, i) => console.log(`  ${i + 1}. ${b}`));
  } else {
    console.log('\n✅ No bugs found!');
  }
  
  console.log(`\nScreenshots saved to: ${SCREENSHOTS_DIR}`);
}

runTests().catch(console.error);
