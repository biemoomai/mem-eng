import http from 'http';

http.get('http://localhost:5173/purge', (res) => {
  console.log(`Server responded with status code: ${res.statusCode}`);
  console.log('Headers:', res.headers);
  res.on('data', (chunk) => {
    // print first 200 characters of HTML response
    console.log('HTML snippet:', chunk.toString().slice(0, 200));
  });
}).on('error', (err) => {
  console.error('Connection error:', err.message);
});
