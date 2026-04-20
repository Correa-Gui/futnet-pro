const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const baseURL = 'http://127.0.0.1:4173';
const email = 'admin@admin.com';
const password = 'admin123';

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

async function savePage(page, file, options = {}) {
  ensureDir(file);
  await page.screenshot({ path: file, fullPage: true, ...options });
  console.log(`saved ${file}`);
}

async function waitForAppReady(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);
}

async function goto(page, route) {
  await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);
}

async function login(page) {
  await goto(page, '/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/\/admin|\/change-password/, { timeout: 30000 });
  if (page.url().includes('/change-password')) {
    await page.getByLabel('Nova senha').fill(password);
    await page.getByLabel('Confirmar senha').fill(password);
    await page.getByRole('button', { name: /Salvar e continuar/ }).click();
    await page.waitForTimeout(1500);
    await goto(page, '/admin');
  }
  await waitForAppReady(page);
}

async function clickTabByIndex(page, index) {
  const tabs = page.getByRole('tab');
  await tabs.nth(index).click();
  await waitForAppReady(page);
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();

  try {
    await login(page);

    // Day 1
    await goto(page, '/admin/configuracoes');
    await savePage(page, 'docs/images/admin/day-1/settings-identidade.png');
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(400);
    await savePage(page, 'docs/images/admin/day-1/settings-precos.png');

    await goto(page, '/admin/landing-page');
    await savePage(page, 'docs/images/admin/day-1/landing-geral.png');

    await goto(page, '/admin/whatsapp');
    await clickTabByIndex(page, 3);
    await savePage(page, 'docs/images/admin/day-1/whatsapp-config.png');

    // Day 2
    await goto(page, '/admin/quadras');
    await savePage(page, 'docs/images/admin/day-2/quadras-lista.png');
    await page.getByRole('button', { name: /Nova Quadra/ }).click();
    await page.waitForTimeout(500);
    await savePage(page, 'docs/images/admin/day-2/quadras-modal.png');
    await page.keyboard.press('Escape');

    await goto(page, '/admin/professores');
    await savePage(page, 'docs/images/admin/day-2/professores-lista.png');
    await page.getByRole('button', { name: /Novo Professor/ }).click();
    await page.waitForTimeout(500);
    await savePage(page, 'docs/images/admin/day-2/professores-modal.png');
    await page.keyboard.press('Escape');

    await goto(page, '/admin/planos');
    await savePage(page, 'docs/images/admin/day-2/planos-lista.png');
    await page.getByRole('button', { name: /Novo Plano/ }).click();
    await page.waitForTimeout(500);
    await savePage(page, 'docs/images/admin/day-2/planos-modal.png');
    await page.keyboard.press('Escape');

    await goto(page, '/admin/turmas');
    await savePage(page, 'docs/images/admin/day-2/turmas-lista.png');
    await page.getByRole('button', { name: /Nova Turma/ }).click();
    await page.waitForTimeout(500);
    await savePage(page, 'docs/images/admin/day-2/turmas-modal.png');
    await page.keyboard.press('Escape');

    // Day 3
    await goto(page, '/admin/alunos');
    await savePage(page, 'docs/images/admin/day-3/alunos-lista.png');
    await page.getByRole('button', { name: /Novo Aluno/ }).click();
    await page.waitForTimeout(500);
    await savePage(page, 'docs/images/admin/day-3/alunos-modal.png');
    await page.keyboard.press('Escape');

    await goto(page, '/admin/aulas-teste');
    await savePage(page, 'docs/images/admin/day-3/aulas-teste-pendente.png');
    const approvedFilter = page.getByRole('button', { name: /Aprovadas/ });
    if (await approvedFilter.count()) {
      await approvedFilter.click();
      await waitForAppReady(page);
    }
    await savePage(page, 'docs/images/admin/day-3/aulas-teste-aprovada.png');

    // Day 4
    await goto(page, '/admin');
    await savePage(page, 'docs/images/admin/day-4/dashboard-visao-geral.png');

    await goto(page, '/admin/agendamentos');
    await savePage(page, 'docs/images/admin/day-4/agendamentos-semana.png');
    await page.getByRole('button', { name: /Por Quadra/ }).click();
    await waitForAppReady(page);
    await savePage(page, 'docs/images/admin/day-4/agendamentos-quadra.png');

    await goto(page, '/admin/presenca');
    await savePage(page, 'docs/images/admin/day-4/presenca-sessoes.png');

    // Day 5
    await goto(page, '/admin/faturas');
    await savePage(page, 'docs/images/admin/day-5/faturas-lista.png');
    await page.getByRole('button', { name: /Gerar em Lote/ }).click();
    await page.waitForTimeout(500);
    await savePage(page, 'docs/images/admin/day-5/faturas-lote.png');
    await page.keyboard.press('Escape');

    await goto(page, '/admin/pagamentos-professores');
    await savePage(page, 'docs/images/admin/day-5/pagamentos-professores.png');

    // Day 6
    await goto(page, '/admin/whatsapp');
    await clickTabByIndex(page, 0);
    await savePage(page, 'docs/images/admin/day-6/whatsapp-enviar.png');

    await clickTabByIndex(page, 1);
    await savePage(page, 'docs/images/admin/day-6/whatsapp-templates.png');

    await clickTabByIndex(page, 2);
    await savePage(page, 'docs/images/admin/day-6/whatsapp-agendamentos.png');

    // Day 7
    await goto(page, '/admin/analytics');
    await savePage(page, 'docs/images/admin/day-7/analytics.png');

    await goto(page, '/admin/roles');
    await savePage(page, 'docs/images/admin/day-7/permissoes.png');

    await goto(page, '/admin/system-users');
    await savePage(page, 'docs/images/admin/day-7/usuarios-sistema.png');

    console.log('All screenshots generated successfully.');
  } catch (error) {
    console.error(error);
    await savePage(page, 'docs/images/admin/debug-failure.png').catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
