/** UI helpers for registration forms. */

async function checkCiap(page, code) {
  const addBtn = page.getByRole('button', { name: /Adicionar CIAP/i });
  if (await addBtn.count()) {
    await addBtn.first().click();
  }
  const checkbox = page
    .locator('label.d-block')
    .filter({ hasText: code })
    .locator('input[type="checkbox"]')
    .first();
  await checkbox.scrollIntoViewIfNeeded();
  await checkbox.check({ force: true });
}

export async function fillLabeledInput(page, labelText, value) {
  const label = page.locator('label.form-label').filter({ hasText: new RegExp(`^${labelText}$`) }).first();
  await label.locator('xpath=following-sibling::*[1]').fill(value);
}

export async function selectLabeled(page, labelText, value) {
  const label = page.locator('label.form-label').filter({ hasText: new RegExp(`^${labelText}$`) }).first();
  await label.locator('xpath=following-sibling::*[1]').selectOption(value);
}

export async function fillResponsibleForm(page, data) {
  if (data.responsible_type === 'another') {
    await page.getByRole('button', { name: 'Para outra pessoa' }).click();
  } else if (data.responsible_type === 'pet') {
    await page.getByRole('button', { name: 'Para pet' }).click();
  } else {
    await page.getByRole('button', { name: 'Para mim' }).click();
  }

  await fillLabeledInput(page, 'Nome', data.associate_name);
  await fillLabeledInput(page, 'Sobrenome', data.associate_last_name);
  await fillLabeledInput(page, 'Nascimento', data.associate_birth_date);
  await page.locator('select.form-select, select.form-control').first().selectOption(data.gender);
  await fillLabeledInput(page, 'Nacionalidade', data.nationality);
  await fillLabeledInput(page, 'CPF', data.associate_cpf);
  await fillLabeledInput(page, 'RG', data.associate_rg);
  await fillLabeledInput(page, 'Órgão emissor', data.associate_rg_issuer);
  await selectLabeled(page, 'Estado civil', data.marital_status);
  const phone = page.locator('.kunk-phone-input input[type="tel"], .react-tel-input input').first();
  await phone.fill('');
  await phone.pressSequentially(String(data.mobile_number).replace(/\D/g, ''), { delay: 15 });
  await fillLabeledInput(page, 'Rua', data.street);
  await fillLabeledInput(page, 'Número', data.street_number);
  await fillLabeledInput(page, 'Bairro', data.neighborhood);
  await fillLabeledInput(page, 'Cidade', data.city);
  await selectLabeled(page, 'UF', data.state);
  await fillLabeledInput(page, 'CEP', data.cep);
  await page.locator('textarea').first().fill(data.reason_treatment_text);

  for (const code of data.ciap_codes || []) {
    await checkCiap(page, code);
  }
}

export async function fillPatientForm(page, data) {
  await fillLabeledInput(page, 'Nome', data.associate_name);
  await fillLabeledInput(page, 'Sobrenome', data.associate_last_name);
  await fillLabeledInput(page, 'Nascimento', data.associate_birth_date);
  await page.locator('select.form-select, select.form-control').first().selectOption(data.gender);
  await fillLabeledInput(page, 'Nacionalidade', data.nationality);
  await fillLabeledInput(page, 'CPF', data.associate_cpf);
  await fillLabeledInput(page, 'RG', data.associate_rg);
  await fillLabeledInput(page, 'Órgão emissor', data.associate_rg_issuer);
  await page.locator('textarea').first().fill(data.reason_treatment_text);
  for (const code of data.ciap_codes || []) {
    await checkCiap(page, code);
  }
}

export async function uploadTinyJpeg(page, inputId) {
  await page.locator(`#${inputId}`).setInputFiles({
    name: 'doc.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  });
}
