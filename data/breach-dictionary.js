/**
 * data/breach-dictionary.js
 * Geometric Password — Breach Dictionary
 * ========================================
 *
 * HOW TO UPDATE THIS FILE
 * -----------------------
 * 1. Open this file in any plain text editor (VS Code, Notepad, TextEdit).
 * 2. Add new passwords to the BREACH_PASSWORDS array below.
 *    Each entry: single-quoted string + comma.  Example:
 *      'mynewpassword',
 * 3. Save the file.
 * 4. On GitHub: navigate to data/breach-dictionary.js → click the pencil ✏️
 *    icon → make your changes → click "Commit changes".
 *    GitHub Pages will redeploy automatically within ~60 seconds.
 *
 * Sources for updates:
 *   https://github.com/danielmiessler/SecLists/tree/master/Passwords
 *   https://haveibeenpwned.com/Passwords
 *   https://www.ncsc.gov.uk/blog-post/passwords-passwords-everywhere
 *
 * Last updated : 2024-01-01
 * Entry count  : 200
 */

const BREACH_PASSWORDS = [
  // ── Top breached globally ──
  'password','123456','12345678','qwerty','abc123',
  'monkey','1234567','letmein','trustno1','dragon',
  'baseball','iloveyou','master','sunshine','ashley',
  'bailey','passw0rd','shadow','123123','654321',
  'superman','qazwsx','michael','football','password1',
  'password123','princess','welcome','solo','login',
  'hello','charlie','donald','password2','qwerty123',
  '1q2w3e4r','aa12345678','abc1234','password01',
  'pass','test','1234','12345','123456789',
  '1234567890','000000','111111','696969','121212',

  // ── Numeric sequences ──
  '222222','333333','444444','555555','666666',
  '777777','888888','999999','159753','7777777',
  '123321','112233','102030','102938','1111','2222',
  '3333','4444','5555','6666','7777','8888','9999',
  '0000','11111','00000','55555',

  // ── Keyboard walks ──
  '1q2w3e','q1w2e3r4','123qwe','zxcvbnm',
  'qwertyuiop','asdfghjkl','zxcvbn','qwer1234',
  'qwerty1','1q2w3e4r5t','qwertyui',

  // ── Common word + number combos ──
  'dragon1','dragon12','letmein1','welcome1',
  'iloveyou1','monkey1','master1','sunshine1',
  'princess1','football1','baseball1','shadow1',
  'michael1','jessica','jessica1','jennifer',
  'jennifer1','thomas','thomas1','robert','robert1',
  'george','george1','hunter','hunter1','hunter2',
  'buster','buster1','ranger','ranger1','tigger',
  'tigger1','soccer','soccer1','hockey','hockey1',
  'harley','harley1','dallas','dallas1','yankees',
  'yankees1','joshua','joshua1','maggie','maggie1',

  // ── Default / system credentials ──
  'admin','admin123','root','toor','alpine',
  'raspberry','ubuntu','debian','changeme','default',
  'guest','user','test123','administrator',
  'adminadmin','admin1234','root123','pass123',

  // ── Leet-speak variants ──
  'pa$$w0rd','p@ssw0rd','p@ssword','pass@123',
  'P@ssw0rd','P@$$w0rd','Admin1234','Passw0rd!',
  'p4ssword','passw0rd1','pa55word','p@55w0rd',

  // ── Pop culture / common phrases ──
  'starwars','batman','superman1','spiderman',
  'pokemon','nintendo','playstation','minecraft',
  'fortnite','roblox','matrix','matrix1',
  'falcon','falcon1','maverick','maverick1',
  'pepper','pepper1','ginger','ginger1',
  'summer','summer1','winter','winter1',
  'spring','spring1','access','access1',
  'cheese','banana','butter','andrew',
  'chelsea','golfer','cookie','bigdog',
  'guitar','winner','secret','secret1',

  // ── Short / trivial ──
  'abc','abcd','aaaaaa','bbbbbb',
  'love','love123','pass1','pass12',
  '12qwas','zaq12wsx','1qaz2wsx',

  // ── Site-specific common patterns ──
  'linkedin','facebook','twitter','instagram',
  'google','amazon','netflix','spotify',
  'apple123','microsoft','windows','office365',
];

// Build O(1) Set — do not modify below this line
window.BREACH_LIST = new Set(
  BREACH_PASSWORDS.flatMap(p => [p, p.toLowerCase()])
);
