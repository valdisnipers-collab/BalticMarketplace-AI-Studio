import db from './server/db';
db.prepare("UPDATE users SET role = 'admin' WHERE email = 'valdis.nipers@gmail.com'").run();
console.log('Made admin');
