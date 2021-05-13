let arc = require('@architect/functions');

exports.handler = arc.http.async(async function http () {
    let services = await arc.services();
    return {
        statusCode: 200,
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
  <title>Architect Cognito User Pool Example!</title>
  <link rel="stylesheet" href="${arc.static('app.css')}">
</head>
<body>
<h1>Architect Cognito Plugin User Pool Example</h1>
<p>The current app has the following variables exported (including by the Cognito plugin):</p>
<pre><code>
${JSON.stringify(services, null, 2)}
</code></pre>
</body>
</html>`
    };
});
