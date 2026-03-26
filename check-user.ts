import db from './server/db';
const user = db.prepare('SELECT * FROM users WHERE email = ?').get('valdis.nipers@gmail.com');
console.log(user);
