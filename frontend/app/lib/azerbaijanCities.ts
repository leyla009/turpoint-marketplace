// Azerbaijani alphabet order, used to sort AZERBAIJAN_CITIES below instead
// of `localeCompare(x, 'az')`. That locale-aware sort depends on the ICU
// data baked into whatever JS engine runs it, which differs between
// Node (server-side render) and the browser (client-side render) - the two
// could silently disagree on ə/ı/ö/ü/ç/ş/ğ ordering and produce a
// server/client markup mismatch (a React hydration error) purely from list
// order. A fixed index lookup gives the identical order everywhere.
// Lower- and upper-case pairs listed explicitly (rather than lower-casing
// input at compare time) so this never touches a locale-aware case-mapping
// API either - Intl case folding for the dotted/dotless İ/I pair is itself
// ICU-version-dependent, which is exactly the kind of environment
// difference this function exists to avoid.
const AZ_ALPHABET_LOWER = 'abcçdeəfgğhxıijklmnoöprsştuüvyz';
const AZ_ALPHABET_UPPER = 'ABCÇDEƏFGĞHXIİJKLMNOÖPRSŞTUÜVYZ';
function azRank(char: string): number {
  const i = AZ_ALPHABET_LOWER.indexOf(char);
  if (i !== -1) return i;
  const j = AZ_ALPHABET_UPPER.indexOf(char);
  return j !== -1 ? j : AZ_ALPHABET_LOWER.length;
}
function azCompare(a: string, b: string): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ra = i < a.length ? azRank(a[i]) : -1;
    const rb = i < b.length ? azRank(b[i]) : -1;
    if (ra !== rb) return ra - rb;
  }
  return 0;
}

// Azerbaijan's district centers plus its major cities. Shared by the
// homepage's Haradan?/Hara? dropdowns and the add-tour form's Məkan
// dropdown - a tour marketplace covering the whole country should let you
// pick any of them, not just the handful that happen to have a tour
// listed right now.
export const AZERBAIJAN_CITIES = [
  'Ağcabədi', 'Ağdam', 'Ağdaş', 'Ağstafa', 'Ağsu', 'Astara', 'Bakı', 'Balakən',
  'Beyləqan', 'Bərdə', 'Biləsuvar', 'Cəbrayıl', 'Cəlilabad', 'Daşkəsən',
  'Füzuli', 'Gədəbəy', 'Gəncə', 'Goranboy', 'Göyçay', 'Göygöl', 'Hacıqabul',
  'Xaçmaz', 'Xankəndi', 'Xızı', 'Xocalı', 'Xocavənd', 'İmişli', 'İsmayıllı',
  'Kəlbəcər', 'Kürdəmir', 'Qax', 'Qazax', 'Qəbələ', 'Qobustan', 'Quba',
  'Qubadlı', 'Qusar', 'Laçın', 'Lənkəran', 'Lerik', 'Masallı', 'Mingəçevir',
  'Naftalan', 'Naxçıvan', 'Neftçala', 'Oğuz', 'Ordubad', 'Saatlı', 'Sabirabad',
  'Salyan', 'Samux', 'Siyəzən', 'Sumqayıt', 'Şabran', 'Şamaxı', 'Şəki',
  'Şəmkir', 'Şirvan', 'Şuşa', 'Tərtər', 'Tovuz', 'Ucar', 'Yardımlı', 'Yevlax',
  'Zaqatala', 'Zəngilan', 'Zərdab',
].sort(azCompare);
