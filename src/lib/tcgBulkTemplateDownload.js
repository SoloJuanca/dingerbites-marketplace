/**
 * Genera y descarga el CSV de plantilla para carga masiva TCG (mismas columnas que BulkUpload).
 * @param {string|number} categoryId
 * @param {string|number} groupId
 */
export async function downloadTcgBulkTemplateCsv(categoryId, groupId) {
  const cid = String(categoryId);
  const gid = String(groupId);

  const [productsResponse, pricesResponse] = await Promise.all([
    fetch(`/api/tcg/${cid}/${gid}/products`, { cache: 'no-store' }),
    fetch(`/api/tcg/${cid}/${gid}/prices`, { cache: 'no-store' })
  ]);

  const productsData = await productsResponse.json();
  const pricesData = await pricesResponse.json();

  if (!productsResponse.ok) {
    throw new Error(productsData?.error || 'No se pudieron cargar los productos del grupo');
  }
  if (!pricesResponse.ok) {
    throw new Error(pricesData?.error || 'No se pudieron cargar las variantes del grupo');
  }

  const products = Array.isArray(productsData.results) ? productsData.results : [];
  const prices = Array.isArray(pricesData.results) ? pricesData.results : [];

  const subTypesByProductId = new Map();
  prices.forEach((price) => {
    const productId = String(price.productId);
    if (!subTypesByProductId.has(productId)) subTypesByProductId.set(productId, new Set());
    subTypesByProductId.get(productId).add(price.subTypeName || 'Normal');
  });

  const getNumberFromExtendedData = (ext) => {
    if (!Array.isArray(ext)) return { raw: '', sort: Number.POSITIVE_INFINITY };
    const row = ext.find((x) => {
      const key = String(x?.displayName || x?.name || '').trim().toLowerCase();
      return key === 'number';
    });

    const raw = String(row?.value || '').trim(); // e.g. "069/221"
    const left = raw.split('/')[0]?.trim() || '';
    const sort = left && /^\d+$/.test(left) ? Number(left) : Number.POSITIVE_INFINITY;
    return { raw, sort };
  };

  const escapeCell = (value) => {
    const text = String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replace(/"/g, '""')}"`;
  };

  // Formato compatible con el bulk uploader (variant rows):
  // Nombre, Variante, Stock, TCG Product ID
  const header = ['Nombre', 'Variante', 'Stock', 'TCG Product ID'];
  const rows = [header.join(',')];

  // Ordenar por Number (extendedData.Number, ej. 069/221) y NO agrupar:
  // cada variante va en su propia fila.
  const sortedProducts = [...products]
    .map((p) => {
      const name = String(p?.name || p?.cleanName || '').trim();
      const productId = String(p?.productId ?? '');
      const number = getNumberFromExtendedData(p?.extendedData);
      return { p, name, productId, number };
    })
    .filter((x) => x.name && x.productId)
    .sort((a, b) => {
      const n = a.number.sort - b.number.sort;
      if (n !== 0) return n;
      const raw = String(a.number.raw).localeCompare(String(b.number.raw), 'en', { sensitivity: 'base' });
      if (raw !== 0) return raw;
      return String(a.name).localeCompare(String(b.name), 'en', { sensitivity: 'base' });
    });

  sortedProducts.forEach(({ name, productId }) => {
    const subTypesSet = subTypesByProductId.get(productId);
    const subTypes = subTypesSet && subTypesSet.size > 0 ? [...subTypesSet] : ['Normal'];

    subTypes.forEach((subType) => {
      rows.push(
        [
          escapeCell(name),
          escapeCell(subType || 'Normal'),
          '0',
          escapeCell(productId)
        ].join(',')
      );
    });
  });

  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `template_tcg_${cid}_${gid}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
