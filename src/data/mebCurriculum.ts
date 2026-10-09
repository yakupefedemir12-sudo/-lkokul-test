import { SubjectInfo, QuizQuestion } from '../types';

export const MEB_CURRICULUM: SubjectInfo[] = [
  {
    id: 'matematik',
    name: 'Matematik',
    icon: 'Calculator',
    color: 'from-amber-500 to-orange-500',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
    badgeText: 'text-amber-700',
    topics: [
      'Doğal Sayılar ve Basamak Değeri',
      'Toplama ve Çıkarma İşlemi',
      'Çarpma ve Bölme İşlemi',
      'Kesirler ve Kesirlerle İşlemler',
      'Zaman Ölçme',
      'Geometrik Cisimler ve Şekiller',
      'Uzunluk ve Çevre Ölçme',
      'Tartma ve Sıvı Ölçme',
      'Veri Toplama ve Grafikler',
      'Tüm Konulardan Karışık (Genel Tekrar)',
    ],
  },
  {
    id: 'turkce',
    name: 'Türkçe',
    icon: 'BookOpen',
    color: 'from-sky-500 to-blue-600',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-300',
    badgeText: 'text-sky-700',
    topics: [
      'Okuduğunu Anlama ve Metin Soruları',
      'Sözcükte Anlam (Eş/Zıt/Mecaz Anlam)',
      'Cümlede Anlam ve Atasözleri-Deyimler',
      'Yazım Kuralları ve Noktalama İşaretleri',
      'Metin Türleri ve Şiir',
      'Tüm Konulardan Karışık (Genel Tekrar)',
    ],
  },
  {
    id: 'fen_bilimleri',
    name: 'Fen Bilimleri',
    icon: 'FlaskConical',
    color: 'from-emerald-500 to-teal-600',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    badgeText: 'text-emerald-700',
    topics: [
      'Yer Kabuğu ve Dünyamızın Hareketleri',
      'Besinlerimiz ve Sağlıklı Yaşam',
      'Kuvvetin Etkileri ve Mıknatıslar',
      'Maddenin Özellikleri ve Halleri',
      'Aydınlatma ve Ses Teknolojileri',
      'İnsan ve Çevre',
      'Basit Elektrik Devreleri',
      'Tüm Konulardan Karışık (Genel Tekrar)',
    ],
  },
  {
    id: 'sosyal_bilgiler',
    name: 'Sosyal Bilgiler',
    icon: 'Compass',
    color: 'from-purple-500 to-indigo-600',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-300',
    badgeText: 'text-purple-700',
    topics: [
      'Birey ve Toplum',
      'Kültür ve Miras (Milli Mücadele)',
      'Yaşadığımız Yer',
      'Bilim Teknoloji ve Toplum',
      'Üretim Dağıtım ve Tüketim',
      'Etkin Vatandaşlık',
      'Küresel Bağlantılar',
      'Tüm Konulardan Karışık (Genel Tekrar)',
    ],
  },
  {
    id: 'insan_haklari',
    name: 'İnsan Hakları, Yurttaşlık ve Demokrasi',
    icon: 'Scale',
    color: 'from-rose-500 to-pink-600',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
    badgeText: 'text-rose-700',
    topics: [
      'İnsan Olmak ve İnsanın Değeri (Hak ve Özgürlüklerimiz)',
      'Hak, Özgürlük ve Sorumluluk',
      'Adalet ve Eşitlik',
      'Uzlaşı ve Anlaşmazlıkların Çözümü',
      'Kurallar (Okul, Aile ve Toplum Hayatı)',
      'Birlikte Yaşama ve Dayanışma',
      'Tüm Konulardan Karışık (Genel Tekrar)',
    ],
  },
  {
    id: 'trafik_guvenligi',
    name: 'Trafik Güvenliği',
    icon: 'Car',
    color: 'from-amber-600 to-orange-600',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    badgeText: 'text-amber-800',
    topics: [
      'Trafikte Güvenlik (Trafik Unsurları, Yaya ve Yolcu Güvenliği, Emniyet Kemeri)',
      'Trafik İşaret Levhaları ve Işıklar',
      'Trafikte Saygı ve Kurallara Uymak',
      'Trafikte İlk Yardım Bilinci, İlk Yardım Çantası ve 112 Acil Çağrı',
      'Tüm Konulardan Karışık (Genel Tekrar)',
    ],
  },
  {
    id: 'genel_degerlendirme',
    name: 'Genel Değerlendirme ve Deneme',
    icon: 'Target',
    color: 'from-indigo-600 to-purple-600',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    badgeText: 'text-indigo-700',
    topics: [
      'Tüm Derslerden Karma Deneme Sınavı',
      'Dönem / Ünite Sonu Genel Değerlendirme',
      'Kazanım İzleme ve Tarama Testi',
    ],
  },
];

interface RawQuestion {
  q: string;
  a: string;
  b: string;
  c: string;
  d: string;
  correct: 'A' | 'B' | 'C' | 'D';
  exp: string;
}

// 20 COMPLETELY UNIQUE QUESTIONS FOR EVERY SUBJECT / TOPIC GROUP
export function getFallbackQuestions(subject: string, topic: string): QuizQuestion[] {
  let rawList: RawQuestion[] = [];

  // GENEL DEĞERLENDİRME VE KARMA DENEME
  if (subject === 'Genel Değerlendirme ve Deneme' || subject === 'Genel Değerlendirme' || subject === 'genel_degerlendirme' || (subject && subject.toLowerCase().includes('deneme'))) {
    rawList = [
      // Türkçe (1-4)
      { q: 'Aşağıdaki cümlelerin hangisinde "zıt (karşıt) anlamlı" sözcükler bir arada kullanılmıştır?', a: 'Dün gece erkenden uyudum.', b: 'İyi günde kötü günde daima yan yanayız.', c: 'Kitap okumak insanın ufkunu açar.', d: 'Hızlıca okula doğru koştuk.', correct: 'B', exp: '"İyi" ve "kötü" sözcükleri karşıt anlamlıdır.' },
      { q: '"Göz gezdirmek" deyiminin anlamı aşağıdakilerden hangisidir?', a: 'Çok dikkatli ve uzun uzun incelemek', b: 'Derin derin düşünmek', c: 'Derinlemesine incelemeden kısaca bakıvermek', d: 'Gözlerini kapatıp uyumak', correct: 'C', exp: 'Göz gezdirmek, üstünkörü, ayrıntıya inmeden kısaca bakmak demektir.' },
      { q: 'Aşağıdaki cümlelerin hangisinde büyük harflerin yazımıyla ilgili bir YANLIŞLIK yapılmıştır?', a: 'Bu yaz Ankara\'ya gideceğiz.', b: 'Cumhuriyet Bayramı 29 Ekim\'de kutlanır.', c: 'Arkadaşım ahmet dün bize geldi.', d: 'Türkçe dersinde şiirler okuduk.', correct: 'C', exp: 'Özel isimler daima büyük harfle başlar: "Ahmet" şeklinde yazılmalıdır.' },
      { q: 'Şiirde her bir satıra (dizeye) ne ad verilir?', a: 'Kıta', b: 'Dize (Mısra)', c: 'Paragraf', d: 'Başlık', correct: 'B', exp: 'Şiirin her satırına dize (mısra) denir.' },

      // Matematik (5-8)
      { q: '45.892 doğal sayısının binler basamağındaki rakamın basamak değeri kaçtır?', a: '500', b: '5.000', c: '50.000', d: '50', correct: 'B', exp: 'Binler basamağında 5 vardır, basamak değeri 5 x 1.000 = 5.000\'dir.' },
      { q: 'Bir çiftlikte 24 inek ve 36 tavuk vardır. Bu hayvanların toplam ayak sayısı kaçtır?', a: '144', b: '168', c: '180', d: '120', correct: 'B', exp: 'İnekler: 24 x 4 = 96 ayak. Tavuklar: 36 x 2 = 72 ayak. Toplam: 96 + 72 = 168 ayak.' },
      { q: '60 sayısının 3/5\'i kaçtır?', a: '24', b: '36', c: '40', d: '45', correct: 'B', exp: '60 ÷ 5 = 12; 12 x 3 = 36.' },
      { q: 'Bir kenar uzunluğu 8 cm olan bir karenin çevresi kaç santimetredir?', a: '16', b: '24', c: '32', d: '64', correct: 'C', exp: 'Karenin 4 eşit kenarı vardır: 4 x 8 = 32 cm.' },

      // Fen Bilimleri (9-12)
      { q: 'Dünya\'mızın kendi ekseni etrafında 24 saatte tamamladığı dönme hareketi sonucunda hangisi oluşur?', a: 'Mevsimler', b: 'Gece ve gündüz', c: 'Ay tutulması', d: 'Yıllık sıcaklık farkı', correct: 'B', exp: 'Dünya\'nın kendi ekseni etrafında dönmesiyle gece ve gündüz birbirini takip eder.' },
      { q: 'Vücudumuzda yapıcı ve onarıcı olarak görev yapan, büyüme ve gelişmemizi sağlayan temel besin grubu hangisidir?', a: 'Karbonhidratlar', b: 'Proteinler', c: 'Yağlar', d: 'Vitaminler', correct: 'B', exp: 'Proteinler (et, süt, yumurta, baklagil) yapıcı ve onarıcıdır.' },
      { q: 'Mıknatısların aynı kutupları (N-N veya S-S) birbirini nasıl etkiler?', a: 'Birbirini çeker', b: 'Birbirini iter', c: 'Etkileşmez', d: 'Isı yayar', correct: 'B', exp: 'Mıknatıslarda aynı kutuplar birbirini iter, zıt kutuplar çeker.' },
      { q: 'Aşağıdaki maddelerden hangisi suda YÜZER?', a: 'Demir çivi', b: 'Kuru tahta parçası', c: 'Taş parçası', d: 'Cam bilye', correct: 'B', exp: 'Tahtanın yoğunluğu sudan küçük olduğu için su yüzeyinde yüzer.' },

      // Sosyal Bilgiler (13-15)
      { q: 'Kurtuluş Savaşı\'mız Mustafa Kemal Atatürk\'ün hangi şehre ayak basmasıyla fiilen başlamıştır?', a: 'Ankara', b: 'Samsun', c: 'Erzurum', d: 'Sivas', correct: 'B', exp: '19 Mayıs 1919\'da Atatürk Samsun\'a çıkarak Milli Mücadele\'yi başlattı.' },
      { q: 'Pusulanın renkli (kırmızı) ucu daima hangi ana yönü gösterir?', a: 'Doğu', b: 'Batı', c: 'Kuzey', d: 'Güney', correct: 'C', exp: 'Pusula ibresinin renkli ucu daima Kuzey yönünü gösterir.' },
      { q: 'Bilinçli bir tüketici alışveriş yaparken öncelikle hangisine dikkat etmelidir?', a: 'Ürünün en pahalı olmasına', b: 'Son kullanma tarihine ve TSE damgasına', c: 'Ambalajının parlak olmasına', d: 'Televizyondaki reklamına', correct: 'B', exp: 'Bilinçli tüketici son kullanma tarihine ve kalite belgesine (TSE) bakar.' },

      // İnsan Hakları (16-18)
      { q: 'Çocuk Hakları Sözleşmesi\'ne göre her birey kaç yaşına kadar çocuk kabul edilir?', a: '15', b: '16', c: '18', d: '21', correct: 'C', exp: 'Uluslararası sözleşmeye göre 18 yaşına kadar her birey çocuk kabul edilir.' },
      { q: 'Farklı düşüncelere, kültürlere ve inançlara anlayışla yaklaşmaya ne denir?', a: 'Bencillik', b: 'Hoşgörü', c: 'Ayrımcılık', d: 'İnatçılık', correct: 'B', exp: 'Farklılıklara saygı duymak hoşgörü ve demokratik kültürün temelidir.' },
      { q: 'Haklarımızı ararken aşağıdaki yollardan hangisine başvurmalıyız?', a: 'Kaba kuvvete', b: 'Yasal ve barışçıl yollara', c: 'Kavga etmeye', d: 'Haklarımızdan vazgeçmeye', correct: 'B', exp: 'Demokratik toplumlarda haklar kanuni ve barışçıl yollarla aranır.' },

      // Trafik Güvenliği (19-20)
      { q: 'Taşıtlarda seyahat ederken can güvenliğimiz için mutlaka takmamız gereken güvenlik unsuru hangisidir?', a: 'Güneş gözlüğü', b: 'Emniyet kemeri', c: 'Şapka', d: 'Kulaklık', correct: 'B', exp: 'Emniyet kemeri çarpışma ve ani fren anında savrulmayı önler.' },
      { q: 'Trafik kazası veya acil sağlık durumlarında aranması gereken tek acil çağrı numarası kaçtır?', a: '155', b: '112 Acil Çağrı', c: '110', d: '156', correct: 'B', exp: 'Tüm acil yardım birimleri tek numara 112 altında toplanmıştır.' },
    ];
  }

  // 1. MATEMATİK
  else if (subject === 'Matematik') {
    if (topic.includes('Doğal Sayılar')) {
      rawList = [
        { q: '45.892 doğal sayısının binler basamağındaki rakamın basamak değeri kaçtır?', a: '500', b: '5.000', c: '50.000', d: '50', correct: 'B', exp: 'Binler basamağında 5 vardır, basamak değeri 5 x 1.000 = 5.000\'dir.' },
        { q: '"Yetmiş iki bin dört yüz altı" sayısının rakamlarla yazılışı hangisidir?', a: '72.460', b: '72.046', c: '72.406', d: '720.406', correct: 'C', exp: 'Yetmiş iki bin (72) ve dört yüz altı (406) birleşerek 72.406 olur.' },
        { q: '8, 0, 5, 2, 9 rakamları birer kez kullanılarak yazılabilecek 5 basamaklı en büyük doğal sayı kaçtır?', a: '98.520', b: '98.502', c: '95.820', d: '89.520', correct: 'A', exp: 'Rakamlar büyükten küçüğe dizilir: 9, 8, 5, 2, 0 -> 98.520.' },
        { q: '6, 1, 4, 3, 0 rakamları birer kez kullanılarak yazılabilecek 5 basamaklı en küçük doğal sayı kaçtır?', a: '10.346', b: '01.346', c: '13.046', d: '10.436', correct: 'A', exp: 'Sıfır başa gelemez, en küçük 1 başa gelir ardından 0 konur: 10.346.' },
        { q: '3.468 sayısı en yakın onluğa yuvarlandığında hangi sayı elde edilir?', a: '3.460', b: '3.470', c: '3.500', d: '3.400', correct: 'B', exp: 'Birler basamağındaki 8 rakamı 5 ve üzeri olduğu için onlar basamağı 70\'e yuvarlanır: 3.470.' },
        { q: '8.742 sayısı en yakın yüzlüğe yuvarlandığında hangi sayı bulunur?', a: '8.700', b: '8.750', c: '8.800', d: '9.000', correct: 'A', exp: 'Onlar basamağında 4 (5\'ten küçük) olduğu için alt yüzlük olan 8.700\'e yuvarlanır.' },
        { q: '54.321 sayısında 5 rakamının basamak değeri ile 2 rakamının basamak değeri farkı kaçtır?', a: '49.980', b: '48.000', c: '50.020', d: '49.800', correct: 'A', exp: '50.000 - 20 = 49.980.' },
        { q: '12, 16, 20, 24, ? sayı örüntüsünde soru işareti yerine hangi sayı gelmelidir?', a: '26', b: '28', c: '30', d: '32', correct: 'B', exp: 'Örüntü kuralı her adımda dörder dörder artmaktır: 24 + 4 = 28.' },
        { q: 'Dört basamaklı en küçük tek doğal sayı hangisidir?', a: '1.000', b: '1.001', c: '1.003', d: '1.111', correct: 'B', exp: 'Dört basamaklı en küçük tek sayı birler basamağı 1 olan 1.001 sayısıdır.' },
        { q: '95.000 sayısı kaç yüzlükten oluşur?', a: '95', b: '950', c: '9.500', d: '95.000', correct: 'B', exp: '95.000 ÷ 100 = 950 yüzlükten oluşur.' },
        { q: 'Birler bölüğü 314, binler bölüğü 65 olan altı basamaklı sayı hangisidir?', a: '314.065', b: '65.314', c: '650.314', d: '65.031', correct: 'B', exp: 'Binler bölüğü 65, birler bölüğü 314 olunca sayı 65.314 olur.' },
        { q: 'Rakamları farklı 4 basamaklı en büyük çift sayı hangisidir?', a: '9.998', b: '9.876', c: '9.874', d: '9.864', correct: 'B', exp: 'Rakamları farklı en büyük çift sayı 9.876\'dır.' },
        { q: '34.567 sayısının basamaklarındaki rakamların sayı değerleri toplamı kaçtır?', a: '25', b: '26', c: '27', d: '28', correct: 'A', exp: '3 + 4 + 5 + 6 + 7 = 25.' },
        { q: '6 on binlik + 4 yüzlük + 3 birlikten oluşan doğal sayı kaçtır?', a: '60.403', b: '64.003', c: '60.430', d: '6.403', correct: 'A', exp: 'On binler basamağı 6, yüzler basamağı 4, birler basamağı 3 -> 60.403.' },
        { q: '89.400 < A < 89.405 sıralamasında A yerine kaç farklı doğal sayı gelebilir?', a: '3', b: '4', c: '5', d: '6', correct: 'B', exp: 'A sayısı 89.401, 89.402, 89.403, 89.404 olmak üzere 4 farklı değer alabilir.' },
        { q: 'Binler basamağı 7 olan beş basamaklı en küçük sayı hangisidir?', a: '17.000', b: '10.700', c: '70.000', d: '17.001', correct: 'A', exp: 'Beş basamaklı en küçük sayı için on binler basamağı 1, binler basamağı 7 seçilir: 17.000.' },
        { q: '548 sayısı 1.000\'e tamamlanmak istenirse kaç eklenmelidir?', a: '442', b: '452', c: '462', d: '552', correct: 'B', exp: '1.000 - 548 = 452.' },
        { q: 'Ardışık üç doğal sayının toplamı 66 ise ortanca sayı kaçtır?', a: '21', b: '22', c: '23', d: '24', correct: 'B', exp: '66 ÷ 3 = 22 ortanca sayıdır (21, 22, 23).' },
        { q: '42.000 sayısının 10 katı kaçtır?', a: '420.000', b: '4.200', c: '42.100', d: '420', correct: 'A', exp: 'Bir sayıyı 10 ile çarpmak sağına bir sıfır eklemektir: 420.000.' },
        { q: 'Yüzler basamağındaki rakam 3 artırılırsa sayının değeri nasıl değişir?', a: '3 artar', b: '30 artar', c: '300 artar', d: '3.000 artar', correct: 'C', exp: 'Yüzler basamağındaki her 1 artış sayıya 100 kazandırır; 3 artış 300 artırır.' },
      ];
    } else if (topic.includes('Dört İşlem') || topic.includes('Toplama') || topic.includes('Çarpma')) {
      rawList = [
        { q: '3.450 + 2.685 işleminin sonucu kaçtır?', a: '6.125', b: '6.135', c: '6.035', d: '5.135', correct: 'B', exp: '3.450 + 2.685 = 6.135.' },
        { q: '8.000 - 3.427 işleminin sonucu kaçtır?', a: '4.563', b: '4.573', c: '4.673', d: '5.573', correct: 'B', exp: '8.000 - 3.427 = 4.573.' },
        { q: '145 x 18 işleminin sonucu kaçtır?', a: '2.510', b: '2.610', c: '2.620', d: '2.710', correct: 'B', exp: '145 x 18 = 2.610.' },
        { q: '936 ÷ 12 işleminin sonucu kaçtır?', a: '76', b: '78', c: '82', d: '84', correct: 'B', exp: '936 ÷ 12 = 78.' },
        { q: 'Bir okul gezisine 420 öğrenci ve 18 öğretmen katılmıştır. Otobüsler 45 kişilik olduğuna göre en az kaç otobüs gerekir?', a: '9', b: '10', c: '11', d: '12', correct: 'B', exp: 'Toplam yolcu 420 + 18 = 438 kişidir. 438 ÷ 45 = 9 tam, 33 kişi artar. 10. otobüs gerekir.' },
        { q: 'Günde 35 sayfa kitap okuyan Kerem, 280 sayfalık kitabı kaç günde bitirir?', a: '6', b: '7', c: '8', d: '9', correct: 'C', exp: '280 ÷ 35 = 8 günde bitirir.' },
        { q: 'Bir manavda tanesi 15 TL olan karpuzlardan 40 adet, tanesi 8 TL olan kavunlardan 25 adet satılmıştır. Toplam kaç TL gelir elde edilmiştir?', a: '700', b: '750', c: '800', d: '850', correct: 'C', exp: '(40 x 15) + (25 x 8) = 600 + 200 = 800 TL.' },
        { q: 'Eksilenin 5.600, farkın 1.850 olduğu bir çıkarma işleminde çıkan sayı kaçtır?', a: '3.750', b: '3.850', c: '3.650', d: '4.750', correct: 'A', exp: 'Çıkan = Eksilen - Fark = 5.600 - 1.850 = 3.750.' },
        { q: 'Bir bölme işleminde bölen 14, bölüm 25 ve kalan 6 olduğuna göre bölünen sayı kaçtır?', a: '344', b: '350', c: '356', d: '360', correct: 'C', exp: 'Bölünen = (Bölen x Bölüm) + Kalan = (14 x 25) + 6 = 350 + 6 = 356.' },
        { q: '2.340 + ▲ = 6.000 eşitliğinde ▲ yerine hangi sayı gelmelidir?', a: '3.640', b: '3.660', c: '3.760', d: '4.660', correct: 'B', exp: '6.000 - 2.340 = 3.660.' },
        { q: 'Bir çiftlikte 45 koyun ve 32 tavuk vardır. Bu hayvanların ayak sayıları toplamı kaçtır?', a: '244', b: '254', c: '264', d: '274', correct: 'A', exp: '(45 x 4) + (32 x 2) = 180 + 64 = 244 ayak.' },
        { q: '4 basamaklı en büyük sayı ile 3 basamaklı en büyük sayının farkı kaçtır?', a: '8.990', b: '9.000', c: '9.090', d: '9.900', correct: 'B', exp: '9.999 - 999 = 9.000.' },
        { q: 'Tanesi 12 TL olan kalemlerden 3 düzine alan Emre kaç TL öder?', a: '360', b: '432', c: '442', d: '480', correct: 'B', exp: '3 düzine = 3 x 12 = 36 kalem. 36 x 12 = 432 TL.' },
        { q: 'Kalanlı bir bölme işleminde bölen 9 ise kalanın alabileceği en büyük değer kaçtır?', a: '7', b: '8', c: '9', d: '10', correct: 'B', exp: 'Kalan daima bölenden küçük olmak zorundadır. En fazla 8 olabilir.' },
        { q: '600 ÷ 100 işleminin sonucu kaçtır?', a: '6', b: '60', c: '600', d: '6.000', correct: 'A', exp: '600 ÷ 100 = 6.' },
        { q: '42 x 100 işleminin sonucu kaçtır?', a: '420', b: '4.200', c: '42.000', d: '420.000', correct: 'B', exp: '42 x 100 = 4.200.' },
        { q: 'Bir trende 12 vagon vardır ve her vagonda 58 yolcu oturmaktadır. Trende toplam kaç yolcu vardır?', a: '686', b: '696', c: '706', d: '716', correct: 'B', exp: '12 x 58 = 696 yolcu.' },
        { q: 'Hangi sayının 6 katı 480 eder?', a: '70', b: '80', c: '90', d: '100', correct: 'B', exp: '480 ÷ 6 = 80.' },
        { q: 'Bir bakkal 500 adet yumurtanın 140 tanesini sabah, 215 tanesini öğleden sonra sattı. Geriye kaç yumurta kaldı?', a: '135', b: '145', c: '155', d: '165', correct: 'B', exp: '500 - (140 + 215) = 500 - 355 = 145 yumurta.' },
        { q: '750 sayısının 4 katının 200 eksiği kaçtır?', a: '2.800', b: '2.900', c: '3.000', d: '3.200', correct: 'A', exp: '(750 x 4) - 200 = 3.000 - 200 = 2.800.' },
      ];
    } else {
      // Genel Matematik / Kesirler / Zaman / Geometri
      rawList = [
        { q: 'Payı 3, paydası 7 olan basit kesir hangisidir?', a: '7/3', b: '3/7', c: '3/10', d: '7/10', correct: 'B', exp: 'Pay üstte (3), payda altta (7) yer alır: 3/7.' },
        { q: '48 sayısının 3/8\'i kaçtır?', a: '16', b: '18', c: '20', d: '24', correct: 'B', exp: '48 ÷ 8 = 6; 6 x 3 = 18.' },
        { q: 'Aşağıdaki kesirlerden hangisi birim kesirdir?', a: '2/5', b: '1/9', c: '3/4', d: '5/5', correct: 'B', exp: 'Payı 1 olan kesirler birim kesirdir: 1/9.' },
        { q: 'Hangi kesir 1 tamdan büyüktür (bileşik kesir)?', a: '4/5', b: '6/7', c: '9/8', d: '1/2', correct: 'C', exp: 'Payı paydasına eşit veya paydasından büyük olan kesirler bileşiktir: 9/8.' },
        { q: '3 saat 25 dakika toplam kaç dakikadır?', a: '185 dk', b: '195 dk', c: '205 dk', d: '215 dk', correct: 'C', exp: '3 saat = 180 dk; 180 + 25 = 205 dakikadır.' },
        { q: '14.40\'ta başlayan bir tiyatro oyunu 1 saat 35 dakika sürmüştür. Oyun saat kaçta bitmiştir?', a: '16.05', b: '16.15', c: '16.20', d: '16.25', correct: 'B', exp: '14.40 + 1 sa 35 dk = 16.15.' },
        { q: 'Bir kenar uzunluğu 15 cm olan karenin çevresi kaç santimetredir?', a: '45 cm', b: '60 cm', c: '75 cm', d: '90 cm', correct: 'B', exp: 'Karenin 4 eşit kenarı vardır: 15 x 4 = 60 cm.' },
        { q: 'Kısa kenarı 8 m, uzun kenarı 14 m olan dikdörtgenin çevresi kaç metredir?', a: '40 m', b: '42 m', c: '44 m', d: '48 m', correct: 'C', exp: 'Çevre = 2 x (8 + 14) = 2 x 22 = 44 m.' },
        { q: 'Bir küpün kaç yüzü, kaç köşesi ve kaç ayrıtı vardır?', a: '6 yüz, 8 köşe, 12 ayrıt', b: '8 yüz, 6 köşe, 12 ayrıt', c: '6 yüz, 12 köşe, 8 ayrıt', d: '4 yüz, 6 köşe, 8 ayrıt', correct: 'A', exp: 'Küpün 6 karesel yüzü, 8 köşesi ve 12 ayrıtı vardır.' },
        { q: '5 kilogram kaç gram eder?', a: '50 g', b: '500 g', c: '5.000 g', d: '50.000 g', correct: 'C', exp: '1 kg = 1.000 gramdır; 5 kg = 5.000 gram.' },
        { q: '2.500 mililitre sıvı kaç litre ve mililitredir?', a: '2 L 50 mL', b: '2 L 500 mL', c: '25 L', d: '250 mL', correct: 'B', exp: '2.500 mL = 2 Litre 500 mililitre.' },
        { q: 'Günde 250 mL süt içen bir çocuk 4 günde toplam kaç litre süt içer?', a: '1 L', b: '2 L', c: '500 mL', d: '1,5 L', correct: 'A', exp: '250 x 4 = 1.000 mL = 1 Litre.' },
        { q: 'Aşağıdaki açılardan hangisi dar açıdır?', a: '90°', b: '120°', c: '65°', d: '180°', correct: 'C', exp: 'Ölçüsü 0° ile 90° arasında olan açılar dar açıdır: 65°.' },
        { q: 'Ölçüsü 90° olan açıya ne ad verilir?', a: 'Dar açı', b: 'Dik açı', c: 'Geniş açı', d: 'Doğru açı', correct: 'B', exp: '90 derecelik açı dik açıdır.' },
        { q: 'Bir üçgenin iç açıları toplamı kaç derecedir?', a: '90°', b: '180°', c: '270°', d: '360°', correct: 'B', exp: 'Üçgenin iç açıları toplamı daima 180 derecedir.' },
        { q: '2/9 + 4/9 işleminin sonucu kaçtır?', a: '6/18', b: '6/9', c: '8/9', d: '2/3', correct: 'B', exp: 'Paydalar eşit olduğu için paylar toplanır: (2 + 4)/9 = 6/9.' },
        { q: '7/10 - 3/10 işleminin sonucu kaçtır?', a: '4/10', b: '4/0', c: '10/10', d: '4/20', correct: 'A', exp: '(7 - 3)/10 = 4/10.' },
        { q: 'Bir haftada kaç saat vardır?', a: '144', b: '168', c: '172', d: '180', correct: 'B', exp: '7 gün x 24 saat = 168 saat.' },
        { q: '3 ton kömür kaç kilogramdır?', a: '300 kg', b: '3.000 kg', c: '30.000 kg', d: '300.000 kg', correct: 'B', exp: '1 ton = 1.000 kg; 3 ton = 3.000 kg.' },
        { q: 'Bir simitçi sabah 60 simidin 2/5\'ini satmıştır. Geriye kaç simit kalmıştır?', a: '24', b: '36', c: '40', d: '48', correct: 'B', exp: '60 ÷ 5 = 12; 12 x 2 = 24 satıldı. 60 - 24 = 36 kaldı.' },
      ];
    }
  }

  // 2. TÜRKÇE
  else if (subject === 'Türkçe') {
    rawList = [
      { q: '"Öğretmenimizin tatlı sözleri içimizi ısıttı." Bu cümledeki "tatlı" sözcüğü hangi anlamda kullanılmıştır?', a: 'Gerçek anlam', b: 'Mecaz anlam', c: 'Terim anlam', d: 'Zıt anlam', correct: 'B', exp: 'Tat alma duyusu yerine gönül okşayıcı, sevimli anlamında mecaz olarak kullanılmıştır.' },
      { q: '"Cömert" sözcüğünün zıt (karşıt) anlamlısı aşağıdakilerden hangisidir?', a: 'Yoksul', b: 'Cimri', c: 'Zengin', d: 'Dürüst', correct: 'B', exp: 'Cömert (eli açık) sözcüğünün zıttı cimridir.' },
      { q: '"Güz" kelimesinin eş anlamlısı aşağıdakilerden hangisidir?', a: 'İlkbahar', b: 'Sonbahar', c: 'Kış', d: 'Yaz', correct: 'B', exp: 'Güz sözcüğünün eş anlamlısı sonbahardır.' },
      { q: '"Etekleri zil çalmak" deyiminin anlamı aşağıdakilerden hangisidir?', a: 'Çok korkmak', b: 'Çok sevinmek', c: 'Çok yorulmak', d: 'Çok şaşırmak', correct: 'B', exp: 'Büyük bir sevinç ve heyecan duymak anlamına gelir.' },
      { q: '"Ağaç yaşken eğilir." atasözü neyi anlatmaktadır?', a: 'Ağaçların sulanması gerektiğini', b: 'İnsanların küçük yaşta daha kolay eğitileceğini', c: 'Yaşlıların dinlenmesi gerektiğini', d: 'Doğanın korunmasını', correct: 'B', exp: 'Eğitimin çocukluk ve erken yaşta verilmesinin önemini vurgular.' },
      { q: 'Aşağıdaki cümlelerin hangisinde yazım yanlışı yapılmıştır?', a: 'Yarın Ankara\'ya gideceğiz.', b: 'Ayşe de bizimle gelecek mi?', c: 'Ahmet\'te dün sinemaya gitti.', d: '23 Nisan kutlamaları çok coşkuluydu.', correct: 'C', exp: 'Bağlaç olan "de/da" ayrı yazılmalıdır: "Ahmet de" şeklinde olmalıydı.' },
      { q: '"Eyvah, servis kaçtı ( )" cümlesinde parantez içine hangi noktalama işareti gelmelidir?', a: 'Nokta (.)', b: 'Ünlem (!)', c: 'Soru işareti (?)', d: 'Virgül (,)', correct: 'B', exp: 'Korku, heyecan, endişe bildiren duygusal ünlem cümlelerinin sonuna ünlem işareti konur.' },
      { q: 'Aşağıdaki kelimelerden hangisinin eş seslisi (sesteşi) VARDIR?', a: 'Kalem', b: 'Yüz', c: 'Kitap', d: 'Masa', correct: 'B', exp: '"Yüz" kelimesi hem sayı (100), hem çehre/surat, hem de yüzmek eylemi olarak sesteştir.' },
      { q: '"Küçük karınca yaz boyunca durmadan çalışıp kış için yuvasına buğday taşıdı." Bu cümlede aşağıdaki sorulardan hangisinin cevabı YOKTUR?', a: 'Kim?', b: 'Ne zaman?', c: 'Ne taşıdı?', d: 'Nasıl gitti?', correct: 'D', exp: 'Kim (karınca), Ne zaman (yaz boyunca), Ne taşıdı (buğday) vardır; Nasıl gitti belirtilmemiştir.' },
      { q: 'Aşağıdaki sözcük çiftlerinden hangisi aralarındaki anlam ilişkisi yönüyle diğerlerinden farklıdır?', a: 'İyi - Kötü', b: 'Hızlı - Yavaş', c: 'Beyaz - Ak', d: 'Aşağı - Yukarı', correct: 'C', exp: 'Beyaz - Ak eş anlamlıdır, diğer seçenekler zıt anlamlıdır.' },
      { q: 'Aşağıdaki cümlelerin hangisinde karşılaştırma yapılmıştır?', a: 'Bugün hava dünkünden daha soğuk.', b: 'Bahçedeki elmalar henüz olgunlaşmadı.', c: 'Kitabımı akşam evde unuttum.', d: 'Ders zili saat dokuzda çaldı.', correct: 'A', exp: 'Bugünkü hava durumu dünkü hava durumu ile karşılaştırılmıştır.' },
      { q: '"Pırıl pırıl" ikilemesi aşağıdaki cümlelerin hangisinde cümleye farklı bir anlam katmıştır?', a: 'Güneş pırıl pırıl parlıyordu.', b: 'Odasını pırıl pırıl temizlemiş.', c: 'Pırıl pırıl bir zekâsı vardı.', d: 'Denizin suyu pırıl pırıldı.', correct: 'C', exp: 'Zekâ için kullanıldığında mecaz ve üstün yetenek anlamı taşır.' },
      { q: 'Aşağıdaki cümlelerin hangisinde sebep-sonuç (neden-sonuç) ilişkisi vardır?', a: 'Çok çalıştığı için sınavdan yüz aldı.', b: 'Yarın sinemaya gitmek istiyor.', c: 'Kitabı okursan bana da ver.', d: 'Akşam erken uyumalısın.', correct: 'A', exp: 'Sınavdan yüz almasının nedeni çok çalışmış olmasıdır.' },
      { q: 'Aşağıdaki kelimeler sözlük sırasına göre dizildiğinde hangisi en başta yer alır?', a: 'Balık', b: 'Biber', c: 'Badem', d: 'Baston', correct: 'C', exp: 'B-a-d harfleriyle başlayan "Badem" sözlükte ilk sırada yer alır.' },
      { q: '"Gözden düşmek" deyiminin anlamı nedir?', a: 'Göz doktoruna gitmek', b: 'Eski değerini ve sevgisini yitirmek', c: 'Yere bir şey düşürmek', d: 'Gözlüğü kırmak', correct: 'B', exp: 'Başkalarının gözündeki itibar ve sevgiyi kaybetmek demektir.' },
      { q: 'Şiirin her bir satırına ne ad verilir?', a: 'Kıta', b: 'Dize (Mısra)', c: 'Paragraf', d: 'Metin', correct: 'B', exp: 'Şiiri oluşturan her satıra dize veya mısra denir.' },
      { q: 'Aşağıdakilerden hangisi bir hayal ürünü (kurgusal) ifadedir?', a: 'Kuşlar gökyüzünde süzülüyordu.', b: 'Bulutlar neşeyle birbirine şarkı söylüyordu.', c: 'Güneş batarken hava karardı.', d: 'Çocuk bahçede top oynuyordu.', correct: 'B', exp: 'Bulutların şarkı söylemesi hayal ürünü bir kişileştirmedir.' },
      { q: '"Yaşasın, okullar açılıyor" cümlesinde duygu belirten sözcük hangisidir?', a: 'Okullar', b: 'Açılıyor', c: 'Yaşasın', d: 'Cümle', correct: 'C', exp: '"Yaşasın" kelimesi sevinç ve coşku bildiren ünlemdir.' },
      { q: 'Aşağıdaki cümlelerin hangisinde soru işareti (?) KULLANILMAZ?', a: 'Ödevini bitirdin mi', b: 'Okula ne zaman gideceksin', c: 'Nereye gittiğini bilmiyorum', d: 'Kaçıncı sınıfa gidiyorsun', correct: 'C', exp: '"Nereye gittiğini bilmiyorum" cümlesi soru değil, bilgi veren bildirme cümlesidir, sonuna nokta konur.' },
      { q: '"Göz" kökünden türemiş olan sözcük aşağıdakilerden hangisidir?', a: 'Gözlük', b: 'Gözyaşı', c: 'Gözbebeği', d: 'Gözetlemek', correct: 'A', exp: '"Göz" köküne "-lük" yapım eki gelerek yeni anlamlı bir türemiş sözcük olmuştur.' },
    ];
  }

  // 3. FEN BİLİMLERİ
  else if (subject === 'Fen Bilimleri') {
    rawList = [
      { q: 'Dünyamızın kendi etrafında bir tam dönüşünü tamamlaması ne kadar sürer?', a: '12 saat', b: '24 saat (1 gün)', c: '30 gün', d: '365 gün 6 saat', correct: 'B', exp: 'Dünya kendi ekseni etrafında dönüşünü 24 saatte (1 gün) tamamlar.' },
      { q: 'Dünya\'nın Güneş etrafında dolanması sonucu aşağıdakilerden hangisi oluşur?', a: 'Gece ve gündüz', b: 'Mevsimler', c: 'Ay tutulması', d: 'Rüzgarlar', correct: 'B', exp: 'Dünya\'nın Güneş çevresindeki 1 yıllık dolanımı mevsimleri oluşturur.' },
      { q: 'Vücudumuzda birinci dereceden enerji verici olarak kullanılan besin grubu hangisidir?', a: 'Proteinler', b: 'Karbonhidratlar', c: 'Vitaminler', d: 'Mineraller', correct: 'B', exp: 'Karbonhidratlar vücudumuzun öncelikli enerji deposudur.' },
      { q: 'Vücudumuzda yapıcı ve onarıcı görev üstlenen, büyüme ve kırıkların iyileşmesini sağlayan besin içeriği hangisidir?', a: 'Proteinler', b: 'Yağlar', c: 'Karbonhidratlar', d: 'Vitaminler', correct: 'A', exp: 'Proteinler kas, doku yapımı ve hücre onarımında görev alır.' },
      { q: 'Aşağıdaki besinlerden hangisi protein bakımından zengindir?', a: 'Ekmek ve makarna', b: 'Yumurta ve et', c: 'Elma ve portakal', d: 'Zeytinyağı', correct: 'B', exp: 'Et, süt, yumurta ve baklagiller zengin protein kaynaklarıdır.' },
      { q: 'Vücudumuzda düzenleyici olarak görev yapan ve hastalıklara karşı direncimizi artıran besin öğeleri hangileridir?', a: 'Karbonhidrat ve yağlar', b: 'Vitamin, su ve mineraller', c: 'Yalnızca şeker', d: 'Yalnızca protein', correct: 'B', exp: 'Vitaminler, su ve mineraller vücudumuzda düzenleyici görev üstlenir.' },
      { q: 'Mıknatıs aşağıdaki maddelerden hangisini ÇEKMEZ?', a: 'Demir çivi', b: 'Nikel madeni para', c: 'Tahta cetvel', d: 'Çelik iğne', correct: 'C', exp: 'Mıknatıslar tahta, plastik, cam, kumaş gibi maddeleri çekmez.' },
      { q: 'Mıknatısların aynı kutupları (N-N veya S-S) birbirine yaklaştırıldığında ne olur?', a: 'Birbirini çeker', b: 'Birbirini iter', c: 'Yapışır', d: 'Hiçbir kuvvet uygulamaz', correct: 'B', exp: 'Mıknatıslarda aynı kutuplar birbirini iter, zıt kutuplar birbirini çeker.' },
      { q: 'Hareket eden bir topa hareket yönünde bir kuvvet uygulanırsa top nasıl hareket eder?', a: 'Yavaşlar', b: 'Hızlanır', c: 'Durur', d: 'Yönü tersine döner', correct: 'B', exp: 'Hareket yönünde uygulanan kuvvet cismi hızlandırır.' },
      { q: 'Aşağıdakilerden hangisi esnek bir maddedir?', a: 'Oyun hamuru', b: 'Paket lastiği', c: 'Cam bardak', d: 'Taş', correct: 'B', exp: 'Paket lastiği kuvvet uygulandığında şekil değiştirir, kuvvet kalktığında eski haline döner.' },
      { q: 'Maddenin uzayda kapladığı alana ne ad verilir?', a: 'Kütle', b: 'Hacim', c: 'Ağırlık', d: 'Yoğunluk', correct: 'B', exp: 'Bir maddenin boşlukta kapladığı yere hacim denir.' },
      { q: 'Maddenin kütlesini ölçmek için hangi araç kullanılır?', a: 'Dereceli silindir', b: 'Eşit kollu terazi (veya elektronik terazi)', c: 'Termometre', d: 'Metre', correct: 'B', exp: 'Kütle eşit kollu terazi veya baskülle ölçülür.' },
      { q: 'Sıvıların hacmini ölçmek için laboratuvarda hangi araç kullanılır?', a: 'Termometre', b: 'Dereceli silindir', c: 'Dinamometre', d: 'Cetvel', correct: 'B', exp: 'Sıvı hacmi dereceli silindir (beherglas) ile ölçülür.' },
      { q: 'Buzun eriyerek suya dönüşmesi hangi hal değişimidir?', a: 'Donma', b: 'Erime', c: 'Buharlaşma', d: 'Yoğuşma', correct: 'B', exp: 'Katı bir maddenin ısı alarak sıvı hale geçmesine erime denir.' },
      { q: 'Tuz ile su karıştırıldığında oluşan yapıya ne ad verilir?', a: 'Saf madde', b: 'Karışım', c: 'Element', d: 'Fosil', correct: 'B', exp: 'Birden çok maddenin kimyasal özelliklerini kaybetmeden bir araya gelmesi karışımdır.' },
      { q: 'Demir tozu ile kumu birbirinden en kolay hangi yöntemle ayırabiliriz?', a: 'Eleme yöntemiyle', b: 'Mıknatıs kullanarak', c: 'Süzme yöntemiyle', d: 'Buharlaştırarak', correct: 'B', exp: 'Mıknatıs demir tozlarını çeker, kum geride kalır.' },
      { q: 'Aşağıdaki aydınlatma araçlarından hangisi geçmişte diğerlerinden DAHA ÖNCE kullanılmıştır?', a: 'Floresan lamba', b: 'Meşale', c: 'Akkor ampul', d: 'LED lamba', correct: 'B', exp: 'Meşale insanlığın ilk ve en eski aydınlatma araçlarındandır.' },
      { q: 'Gereğinden fazla, yanlış yerde ve yanlış zamanda yapılan ışıklandırmaya ne ad verilir?', a: 'Işık kirliliği', b: 'Ses kirliliği', c: 'Hava kirliliği', d: 'Toprak kirliliği', correct: 'A', exp: 'Yanlış ve aşırı aydınlatmaya ışık kirliliği denir.' },
      { q: 'Basit bir elektrik devresinde devreyi açıp kapatmaya yarayan anahtar görevi gören eleman hangisidir?', a: 'Pil', b: 'Ampul', c: 'Anahtar', d: 'Bağlantı kablosu', correct: 'C', exp: 'Anahtar devreden akım geçmesini kontrol eder, açıp kapatır.' },
      { q: 'Basit bir elektrik devresinde elektrik enerjisi kaynağı hangisidir?', a: 'Duy', b: 'Ampul', c: 'Pil', d: 'Anahtar', correct: 'C', exp: 'Pil devrenin enerji ve gerilim kaynağıdır.' },
    ];
  }

  // 4. İNSAN HAKLARI, YURTTAŞLIK VE DEMOKRASİ
  else if (subject.includes('İnsan Hakları') || subject.includes('insan_haklari') || subject.includes('Demokrasi') || subject.includes('Yurttaşlık')) {
    rawList = [
      { q: 'İnsanların doğuştan sahip olduğu, vazgeçilmez ve devredilemez haklara ne denir?', a: 'Sosyal kulüp', b: 'İnsan hakları', c: 'Özel yetenek', d: 'Kişisel hobi', correct: 'B', exp: 'Doğuştan gelen, herkes için geçerli ve vazgeçilmez haklara insan hakları denir.' },
      { q: 'İnsan haklarının en temeli olan ve diğer tüm hakların kullanılmasını sağlayan hak hangisidir?', a: 'Seyahat hakkı', b: 'Yaşama hakkı', c: 'Mülkiyet hakkı', d: 'Tüketici hakkı', correct: 'B', exp: 'Yaşama hakkı en temel haktır; yaşama hakkı olmadan diğer hiçbir hak kullanılamaz.' },
      { q: 'Her insanın kendi fikirlerini başkalarının baskısı altında olmadan ifade edebilmesine ne ad verilir?', a: 'Düşünce ve ifade özgürlüğü', b: 'Meslek seçimi', c: 'Adalet sistemi', d: 'Sosyal yardım', correct: 'A', exp: 'Bireylerin duygu ve düşüncelerini serbestçe söyleyebilmesine düşünce ve ifade özgürlüğü denir.' },
      { q: 'Haklarımızı kullanırken başkalarının haklarına ve kurallara özen göstermek hangi kavramla açıklanır?', a: 'Kişisel çıkar', b: 'Sorumluluk', c: 'Rekabet', d: 'Üstünlük', correct: 'B', exp: 'Hakların bilincinde olmak ve başkalarına zarar vermeden davranmak sorumluluk duygusudur.' },
      { q: 'Kanunlar ve kurallar önünde hiçbir ayrım gözetmeksizin herkesin aynı muameleyi görmesine ne ad verilir?', a: 'Ayrıcalık', b: 'Eşitlik', c: 'Özgüven', d: 'Tolerans', correct: 'B', exp: 'Yasa önünde dil, din, ırk ve cinsiyet farkı gözetmeksizin herkes eşittir.' },
      { q: 'Herkese hak ettiğinin verilmesi, haksızlığın önlenmesi ve haklının korunmasına ne denir?', a: 'Adalet', b: 'Şans', c: 'Kader', d: 'Cömertlik', correct: 'A', exp: 'Hak ve hukuka uygun davranma, herkese payına düşeni verme ilkesine adalet denir.' },
      { q: 'Farklı görüşlerdeki bireylerin bir araya gelerek ortak bir noktada buluşup anlaşmasına ne ad verilir?', a: 'İnatlaşma', b: 'Uzlaşı', c: 'Küsme', d: 'Tartışma', correct: 'B', exp: 'Görüş ayrılıklarını karşılıklı anlayışla çözüp anlaşmaya uzlaşı denir.' },
      { q: 'Anlaşmazlıkların çözümünde başvurulması gereken en medeni ve etkili yol hangisidir?', a: 'Öfkeyle bağırmak', b: 'İletişim ve diyalog kurmak', c: 'Ortamı terk edip küsmek', d: 'Kendi fikrini zorla kabul ettirmek', correct: 'B', exp: 'Sorunlar karşılıklı saygı çerçevesinde konuşarak ve dinleyerek çözülür.' },
      { q: 'Okul kurallarına uymak öğrencilere ve okula ne kazandırır?', a: 'Sadece yorulmayı', b: 'Güvenli, huzurlu ve adil bir öğrenme ortamı', c: 'Sıkıcı dersler', d: 'Daha çok ödev', correct: 'B', exp: 'Kurallar birlikteliği düzenler, güvenliği sağlar ve öğrenmeyi kolaylaştırır.' },
      { q: 'Toplumda barış ve huzur ortamının sürdürülebilmesi için hangisi zorunludur?', a: 'Herkesin aynı fikirde olması', b: 'Farklılıklara saygı ve hoşgörü', c: 'Kuralların görmezden gelinmesi', d: 'Yalnızca büyüklerin konuşması', correct: 'B', exp: 'Farklılıklara saygı duymak ve empati kurmak toplumsal barışı güçlendirir.' },
      { q: 'Zor durumda olan bir arkadaşımıza veya komşumuza karşılıksız destek olmak hangi değere örnektir?', a: 'Kıskançlık', b: 'Dayanışma ve yardımlaşma', c: 'Bencillik', d: 'Gösteriş', correct: 'B', exp: 'Birlikte yaşamanın en güzel kuralı yardımlaşma ve dayanışmadır.' },
      { q: 'Çocuk Hakları Sözleşmesi\'ne göre her çocuğun okula gitmesi ve bilgi edinmesi hangi hak kapsamındadır?', a: 'Seyahat hakkı', b: 'Eğitim hakkı', c: 'Mülk edinme hakkı', d: 'Ticaret hakkı', correct: 'B', exp: 'Her çocuk nitelikli, ücretsiz ve eşit bir şekilde eğitim alma hakkına sahiptir.' },
      { q: 'Hastalandığımızda doktora gitmek ve tedavi olmak hangi temel insan hakkımızdır?', a: 'Dinlenme hakkı', b: 'Sağlık hakkı', c: 'Oyun hakkı', d: 'Vatandaşlık hakkı', correct: 'B', exp: 'Sağlıklı bir çevrede yaşama ve sağlık hizmeti alma her bireyin temel hakkıdır.' },
      { q: 'Aile içerisinde kararlar alınırken çocukların da fikrinin dinlenmesi neyi gösterir?', a: 'Ailenin disiplinsiz olduğunu', b: 'Demokratik ve saygılı bir aile ortamını', c: 'Zaman kaybı yaşandığını', d: 'Çocukların kararları yönettiğini', correct: 'B', exp: 'Aile içi istişare ve fikir paylaşımı çocukta özgüven ve demokrasi bilinci geliştirir.' },
      { q: 'Sınıf başkanlığı seçiminde her öğrencinin bir oy hakkı olması hangi ilkeyi simgeler?', a: 'Eşitlik ve demokrasi', b: 'Tesadüf', c: 'Kura çekimi', d: 'Öğretmen otoritesi', correct: 'A', exp: 'Seçimlerde herkesin eşit oy hakkı olması demokrasinin ve eşitliğin göstergesidir.' },
      { q: 'Haklarımızın ihlal edildiğini düşündüğümüzde başvurmamız gereken resmi yöntem hangisidir?', a: 'Kavga etmek', b: 'Dilekçe hakkını kullanarak ilgili makama başvurmak', c: 'Sosyal medyada hakaret etmek', d: 'Hakkımızdan vazgeçmek', correct: 'B', exp: 'Vatandaşlar hak arama hürriyetini yasal yollarla ve dilekçeyle kullanır.' },
      { q: 'Engelli bireylerin kaldırımları ve kamu binalarını rahatça kullanabilmesi için yapılan rampalar neyi sağlar?', a: 'Fırsat eşitliği ve adaleti', b: 'Mimaride süslemeyi', c: 'Trafik yoğunluğunu', d: 'Ekstra masrafı', correct: 'A', exp: 'Özel gereksinimli bireylerin haklarını eşit kullanabilmesi adaletin gereğidir.' },
      { q: 'Sınıfımızdaki veya çevremizdeki ortak eşyaları temiz ve özenli kullanmak ne tür bir davranıştır?', a: 'Zorunlu olmayan bir iş', b: 'Ortak yaşama saygı ve sorumluluk', c: 'Kişisel menfaat', d: 'Öğretmenden puan alma çabası', correct: 'B', exp: 'Ortak yaşam alanlarını ve eşyaları korumak sorumlu yurttaşlık bilincidir.' },
      { q: 'Aşağıdakilerden hangisi bir öğrencinin okuldaki sorumluluklarından biridir?', a: 'Okulun faturalarını ödemek', b: 'Ders araç gereçlerini düzenli getirmek ve dersi dinlemek', c: 'Okulun boyasını yenilemek', d: 'Öğretmenlerin maaşını hesaplamak', correct: 'B', exp: 'Derslere zamanında girmek ve ödevlerini yapmak öğrencinin temel sorumluluğudur.' },
      { q: 'Bir kimsenin haklarını kullanırken başkalarının haklarını çiğnememesi hangi ilkeyle özetlenir?', a: 'Özgürlük sınırsızdır', b: 'Benim özgürlüğüm başkasının hakkının başladığı yerde biter', c: 'Güçlü olan haklıdır', d: 'Herkes istediğini yapabilir', correct: 'B', exp: 'Özgürlük sınırsız değildir; başkalarının hak ve huzuru gözetilmelidir.' },
    ];
  }

  // 5. TRAFİK GÜVENLİĞİ
  else if (subject.includes('Trafik') || subject.includes('trafik_guvenligi')) {
    rawList = [
      { q: 'Karayolunda hareket halinde veya duran insan, hayvan ve araçların tümüne ne ad verilir?', a: 'Ulaşım', b: 'Trafik', c: 'Yolculuk', d: 'Taşıt kervanı', correct: 'B', exp: 'İnsan, hayvan ve taşıtların karayolu üzerindeki hareketlerinin bütününe trafik denir.' },
      { q: 'Yaya kaldırımı bulunmayan iki yönlü karayollarında yayalar yolun neresinden yürümelidir?', a: 'Yolun tam ortasından', b: 'Gidiş yönüne göre sol banketten', c: 'Gidiş yönüne göre sağ banketten', d: 'Fark etmez, araçlarla beraber', correct: 'B', exp: 'Kaldırımsız yollarda yayalar karşıdan gelen araçları rahatça görebilmek için sol taraftan yürümelidir.' },
      { q: 'Otomobilde seyahat ederken sürücü ve tüm yolcuların can güvenliği için takması ZORUNLU olan güvenlik donanımı hangisidir?', a: 'Güneş gözlüğü', b: 'Emniyet kemeri', c: 'Kulaklık', d: 'Kışlık mont', correct: 'B', exp: 'Emniyet kemeri kaza ve ani fren anında araçtan fırlamayı ve ağır yaralanmaları önler.' },
      { q: 'Karşıdan karşıya geçerken tercih etmemiz gereken EN GÜVENLİ geçiş yerleri nerelerdir?', a: 'Virajlar ve iki aracın arası', b: 'Yaya geçidi, okul geçidi, alt ve üst geçitler', c: 'Trafiğin en hızlı aktığı noktalar', d: 'Otoyol bariyerleri üzerinden atlamak', correct: 'B', exp: 'Yaya/okul geçitleri ile alt-üst geçitler yayalar için en güvenli noktalardır.' },
      { q: 'Trafik ışıklı işaret cihazında KIRMIZI ışık yandığında ne yapılmalıdır?', a: 'Hızlanılmalıdır', b: 'Durulmalıdır', c: 'Dikkatle geçilmelidir', d: 'Korna çalınmalıdır', correct: 'B', exp: 'Kırmızı ışık hem yayalar hem taşıtlar için kesin dur emridir.' },
      { q: 'Trafik ışığında SARI ışık yandığında ne anlama gelir?', a: 'Hemen durulmalı', b: 'Geçmeye veya durmaya hazırlanılmalı', c: 'Geri geri gidilmeli', d: 'Yol trafiğe kapalıdır', correct: 'B', exp: 'Sarı ışık ikaz ışığıdır; kırmızıdan sonra kalkışa, yeşilden sonra duruşa hazırlık bildirir.' },
      { q: 'ÜÇGEN şeklindeki trafik levhaları sürücü ve yayalara genel olarak ne bildirir?', a: 'Yasaklama', b: 'Tehlike uyarısı', c: 'Bilgilendirme', d: 'Otopark yeri', correct: 'B', exp: 'Üçgen levhalar yoldaki tehlikelere karşı uyarı ve dikkat bildirir.' },
      { q: 'DAİRE (yuvarlak) şeklindeki trafik işaret levhaları ne bildirir?', a: 'Tarihi yerleri', b: 'Yasaklama ve kısıtlamaları', c: 'Yolun bittiğini', d: 'Hava durumunu', correct: 'B', exp: 'Yuvarlak kırmızı çerçeveli levhalar yasaklama ve kısıtlama belirtir (Örn: Giriş Yasak).' },
      { q: 'KARE veya DİKDÖRTGEN şeklindeki mavi trafik levhaları ne anlama gelir?', a: 'Tehlike işareti', b: 'Bilgi ve bilgilendirme levhaları', c: 'Hız sınırı', d: 'Kesin dur', correct: 'B', exp: 'Kare veya dikdörtgen levhalar yayalara ve sürücülere bilgi verir (Örn: Hastane, Yaya Geçidi).' },
      { q: 'Trafik kazası, yangın veya acil tıbbi durumlarda aranması gereken tek acil numara kaçtır?', a: '155', b: '112 Acil Çağrı Merkezi', c: '110', d: '156', correct: 'B', exp: 'Türkiye\'de tüm acil yardım birimleri tek numara olan 112 çatısı altında birleştirilmiştir.' },
      { q: 'Taşıtlarda meydana gelebilecek kazalarda yaralılara anında müdahale için bulundurulan çantaya ne denir?', a: 'Alet çantası', b: 'İlk yardım çantası', c: 'Seyahat çantası', d: 'Boya kutusu', correct: 'B', exp: 'İlk yardım çantası acil sağlık müdahalesi malzemelerini barındırır.' },
      { q: 'Toplu taşıma araçlarında (otobüs, metro) hangi bireylere öncelikli olarak yer verilmelidir?', a: 'Çantası hafif olanlara', b: 'Yaşlılar, hamileler, engelliler ve gazilere', c: 'İlk binen kişilere', d: 'En arkada oturanlara', correct: 'B', exp: 'Dezavantajlı, yaşlı ve özel gereksinimli yolculara yer vermek toplumsal bir nezakettir.' },
      { q: 'Okul servis aracına binerken ve inerken yapılması gereken en doğru davranış hangisidir?', a: 'Servis tamamen durmadan kapıya koşmak', b: 'Servisin tam durmasını bekleyip sırayla inip binmek', c: 'Pencereden dışarı sarkmak', d: 'Koridorda ayakta yolculuk yapmak', correct: 'B', exp: 'Servis durmadan hareket edilmemeli, emniyet kemeri bağlı kalınmalıdır.' },
      { q: 'Bisiklet, paten veya kaykay kullanırken can güvenliğimiz için mutlaka takmamız gereken ekipman hangisidir?', a: 'Şapka', b: 'Kask, dizlik ve dirseklik', c: 'Güneş gözlüğü', d: 'Akıllı saat', correct: 'B', exp: 'Düşme anında baş ve eklemleri korumak için kask ve dizlik hayati önem taşır.' },
      { q: 'Gece yürüyüşlerinde yayaların sürücüler tarafından uzaktan kolayca fark edilebilmesi için ne yapılmalıdır?', a: 'Koyu siyah giysiler giyilmelidir', b: 'Açık renkli veya reflektörlü (yansıtıcı) giysiler giyilmelidir', c: 'Hızlıca koşulmalıdır', d: 'Yolun ortasından gidilmelidir', correct: 'B', exp: 'Açık renk ve ışık yansıtan reflektörler sürücülerin yayaları erkenden fark etmesini sağlar.' },
      { q: 'Park etmiş iki aracın arasından yola aniden fırlamak neden çok tehlikelidir?', a: 'Araçlar kirlenebilir', b: 'Gelen sürücüler bizi göremez ve durmaya zamanları kalmaz', c: 'Ayakkabımız tozlanır', d: 'Trafik polisi ceza yazamaz', correct: 'B', exp: 'Görüş açısı kapalı olduğundan ani fırlamalarda sürücüler fren yapamaz.' },
      { q: 'Trafiği yöneten ve kurallara uyulmasını denetleyen resmi görevli kimdir?', a: 'Güvenlik görevlisi', b: 'Trafik polisi ve jandarması', c: 'Belediye zabıtası', d: 'Park bekçisi', correct: 'B', exp: 'Trafik polisi karayollarında düzeni sağlar ve kuralları uygulatır.' },
      { q: 'Trafikte karşılaştığımız yayalara ve diğer sürücülere karşı sabırlı, saygılı ve hoşgörülü olmaya ne denir?', a: 'Yol yarışı', b: 'Trafik adabı ve saygı', c: 'Zaman kaybı', d: 'Acemilik', correct: 'B', exp: 'Trafik kurallarına saygıyla uymak ve nezaket göstermek trafik adabıdır.' },
      { q: 'Işıksız yaya geçitlerinde veya okul geçitlerinde geçiş üstünlüğü kime aittir?', a: 'Hızlı gelen arabalara', b: 'Yayalarındır', c: 'Kamyonlarındır', d: 'Motosikletlerindir', correct: 'B', exp: 'Trafik kanununa göre yaya geçitlerinde geçiş önceliği daima yayalarındır.' },
      { q: 'Trafik kazası anında yaralılara bilinçsizce ve rastgele müdahale etmek neden tehlikelidir?', a: 'Zaman kazandırır', b: 'Yaralının sakatlanmasına veya durumunun kötüleşmesine yol açabilir', c: 'Sağlık ekipleri sevinir', d: 'Hiçbir sakıncası yoktur', correct: 'B', exp: 'İlk yardım eğitimi olmayan kişiler yaralıyı gereksiz hareket ettirmemeli, 112\'yi beklemelidir.' },
    ];
  }

  // 6. SOSYAL BİLGİLER
  else {
    rawList = [
      { q: 'Türkiye Cumhuriyeti kimlik kartımızda yer alan T.C. kimlik numarası kaç basamaklıdır?', a: '9', b: '10', c: '11', d: '12', correct: 'C', exp: 'T.C. kimlik numarası 11 hanelidir ve her vatandaşa özeldir.' },
      { q: 'Bireylerin kendilerini başkalarının yerine koyarak onların duygularını ve düşüncelerini anlamasına ne ad verilir?', a: 'Hoşgörü', b: 'Empati', c: 'Saygı', d: 'Sorumluluk', correct: 'B', exp: 'Kendini başkasının yerine koyma yetisine empati denir.' },
      { q: 'Olayların oluş tarihlerine göre sıraya konulmasına ne ad verilir?', a: 'Biyografi', b: 'Kronoloji', c: 'Otobiyografi', d: 'Coğrafya', correct: 'B', exp: 'Zaman dizini ve olayları oluş sırasına göre dizmeye kronoloji denir.' },
      { q: 'Kurtuluş Savaşı\'mız Mustafa Kemal Atatürk\'ün hangi şehre ayak basmasıyla fiilen başlamıştır?', a: 'Ankara', b: 'Samsun', c: 'Erzurum', d: 'Sivas', correct: 'B', exp: '19 Mayıs 1919\'da Atatürk Samsun\'a çıkarak Milli Mücadele\'yi başlatmıştır.' },
      { q: 'Güneşli bir günde öğle vakti gölgemizin yönü hangi ana yönü gösterir?', a: 'Doğu', b: 'Batı', c: 'Kuzey', d: 'Güney', correct: 'C', exp: 'Kuzey Yarım Küre\'de öğle vakti cisimlerin gölgesi kuzeyi gösterir.' },
      { q: 'Pusulanın renkli (kırmızı) ucu daima hangi yönü gösterir?', a: 'Doğu', b: 'Batı', c: 'Kuzey', d: 'Güney', correct: 'C', exp: 'Pusula ibresinin renkli ucu daima Kuzey yönünü işaret eder.' },
      { q: 'Ağaçların ve taşların yosun tutan yüzü genellikle hangi yönü gösterir?', a: 'Kuzey', b: 'Güney', c: 'Doğu', d: 'Batı', correct: 'A', exp: 'Güneş görmeyen ve nemli kalan kuzey cepheleri yosun tutar.' },
      { q: 'Kutupyıldızı (Demirkazık) gökyüzünde daima hangi yönde bulunur?', a: 'Güney', b: 'Kuzey', c: 'Doğu', d: 'Batı', correct: 'B', exp: 'Kutupyıldızı her zaman tam Kuzey doğrultusundadır.' },
      { q: 'Bir yerin kuş bakışı görünüşünün ölçeksiz olarak kaba taslak çizilmesine ne denir?', a: 'Harita', b: 'Kroki', c: 'Plan', d: 'Minyatür', correct: 'B', exp: 'Ölçeksiz, kaba taslak kuş bakışı çizimlere kroki denir.' },
      { q: 'Aşağıdakilerden hangisi doğal afetlerden biri DEĞİLDİR?', a: 'Deprem', b: 'Heyelan', c: 'Trafik kazası', d: 'Çığ', correct: 'C', exp: 'Trafik kazası insan kaynaklı bir kazadır, doğal afet değildir.' },
      { q: 'Deprem öncesinde evimizde hazırlamamız gereken çantaya ne ad verilir?', a: 'Okul çantası', b: 'Deprem (Afet) çantası', c: 'Piknik çantası', d: 'Seyahat bavulu', correct: 'B', exp: 'Acil durum ihtiyaçlarını barındıran çantaya deprem/afet çantası denir.' },
      { q: 'Aşağıdakilerden hangisi milli kültürümüzü yansıtan ögelerden biridir?', a: 'Cadılar Bayramı', b: 'Kına gecesi ve halk oyunları', c: 'Kano festivali', d: 'Pizza günü', correct: 'B', exp: 'Kına geceleri, halk oyunları ve geleneksel düğünler milli kültürümüzün parçasıdır.' },
      { q: 'Kurtuluş Savaşı\'nda Güney Cephesi\'nde Maraş savunmasının simgesi olan kahramanımız kimdir?', a: 'Sütçü İmam', b: 'Şahin Bey', c: 'Ali Saip Bey', d: 'Hasan Tahsin', correct: 'A', exp: 'Kahramanmaraş\'ta ilk kurşunu atarak direnişi başlatan kahramanımız Sütçü İmam\'dır.' },
      { q: 'Gaziantep savunmasında şehit düşen Milli Mücadele kahramanımız kimdir?', a: 'Şahin Bey', b: 'Sütçü İmam', c: 'Yörük Ali', d: 'Gördesli Makbule', correct: 'A', exp: 'Antep savunmasının efsane komutanı Şahin Bey\'dir.' },
      { q: 'Tarihte ilk defa tekerleği ve yazıyı icat eden uygarlıklar hangi alana katkı sağlamıştır?', a: 'Yalnızca spora', b: 'Bilim ve teknolojiye', c: 'Yalnızca tarıma', d: 'Modaya', correct: 'B', exp: 'Tekerlek ve yazı insanlığın bilim, teknik ve medeniyet gelişiminin temelidir.' },
      { q: 'İnsanların yaşamlarını sürdürebilmek için mutlaka karşılaması gereken durumlara ne denir?', a: 'İstek', b: 'Temel ihtiyaç', c: 'Lüks tüketim', d: 'Eğlence', correct: 'B', exp: 'Beslenme, barınma, giyinme gibi zorunlu unsurlar temel ihtiyaçtır.' },
      { q: 'Aşağıdakilerden hangisi bir temel ihtiyaçtır?', a: 'Akıllı saat', b: 'Beslenme ve su', c: 'Video oyunu', d: 'Paten', correct: 'B', exp: 'Beslenme ve su hayatta kalmak için temel ve vazgeçilmez ihtiyaçtır.' },
      { q: 'Bilinçli bir tüketici alışveriş yaparken öncelikle hangisine dikkat etmelidir?', a: 'Ürünün en pahalı olmasına', b: 'Son kullanma tarihine ve TSE damgasına', c: 'Ambalajının parlak olmasına', d: 'Reklamlarda çok çıkmasına', correct: 'B', exp: 'Bilinçli tüketici ürünün üretim/son kullanma tarihine ve kalite standartlarına (TSE) bakar.' },
      { q: 'Alışveriş sonrasında satıcıdan fatura veya fiş almanın devlete en büyük faydası nedir?', a: 'Dükkanın düzenli olması', b: 'Vergi gelirlerinin devlete aktarılması', c: 'Kağıt israfının önlenmesi', d: 'Para üstünün kolay hesaplanması', correct: 'B', exp: 'Fiş ve fatura almak yapılan ticaretin vergilendirilmesini ve ülkeye katkı sağlamasını sağlar.' },
      { q: 'Çocuk Hakları Sözleşmesi\'ne göre her birey kaç yaşına kadar çocuk kabul edilir?', a: '15', b: '16', c: '18', d: '21', correct: 'C', exp: 'Uluslararası Çocuk Hakları Sözleşmesi\'ne göre 18 yaşına kadar her insan çocuktur.' },
    ];
  }

  // Ensure rawList has exactly 20 distinct questions
  return rawList.slice(0, 20).map((item, index) => ({
    id: index + 1,
    question: `${item.q}`, // NO artificial labels like (Kazanım Alıştırması)
    options: {
      A: item.a,
      B: item.b,
      C: item.c,
      D: item.d,
    },
    correctAnswer: item.correct,
    explanation: item.exp,
  }));
}
