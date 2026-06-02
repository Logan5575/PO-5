const TOKEN = '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';
const DB_ID = '7cf548d1d20245e0a4c3547040c7524d';

async function notionRequest(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});

  const { action, dbId, filter, pageId, properties } = req.body;

  // 페이지 업데이트
  if (action === 'update' && pageId && properties) {
    const data = await notionRequest(
      `https://api.notion.com/v1/pages/${pageId}`,
      'PATCH',
      { properties }
    );
    return res.status(200).json(data);
  }

  // DB 쿼리 (기존 기능)
  const targetDb = dbId || DB_ID;
  if (!targetDb) return res.status(400).json({error: 'dbId required'});

  try {
    let allResults = [];
    let hasMore = true;
    let startCursor = undefined;
    const seenIds = new Set();

    while (hasMore) {
      const body = { page_size: 100 };
      if (filter) body.filter = filter;
      if (startCursor) body.start_cursor = startCursor;

      const data = await notionRequest(
        `https://api.notion.com/v1/databases/${targetDb}/query`,
        'POST',
        body
      );
      if (data.status >= 400) return res.status(data.status).json(data);

      for (const page of (data.results || [])) {
        if (!seenIds.has(page.id)) {
          seenIds.add(page.id);
          allResults.push(page);
        }
      }
      hasMore = data.has_more;
      startCursor = data.next_cursor;
    }
    res.status(200).json({ results: allResults });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
