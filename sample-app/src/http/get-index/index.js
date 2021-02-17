let arc = require('@architect/functions');

exports.handler = async function http (req) {
  let tables = await arc.tables();
  let data = tables.data;
  let items = await data.scan({});
  return {
    headers: {
      'cache-control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
      'content-type': 'text/html; charset=utf8'
    },
    body: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Architect w/ IoT Rules Macro Example</title>
  <link rel="stylesheet" href="${arc.static('app.css')}">
</head>
<body>
<h1>Hi there</h1>
<p>This page shows all connect and disconnect events. To fake these, you can publish to the <pre>$aws/events/presence/connected/clientId</pre> or <pre>$aws/events/presence/disconnected/clientId</pre> topics using the AWS CLI or the Test section of IoT Core inside the AWS Console.</p>
<h3>The list:</h3>
<pre><code>
${JSON.stringify(items, null, 2)}
</code></pre>
</body>
</html>`
  }
}
