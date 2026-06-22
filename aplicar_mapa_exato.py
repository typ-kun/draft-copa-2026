#!/usr/bin/env python3
"""
Aplica mapeamentos exatos (nome -> pid) fornecidos pelo usuario.
Para cada pais: limpa todos os IDs atuais e re-atribui pelos dados exatos.
Match: palavras em comum (order-independent, normalizado).
Fallback: posicional dentro dos pids fornecidos.
"""
import json, unicodedata, sys, io
from pathlib import Path
from collections import defaultdict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ALL_DIR = Path(r"C:\Users\guilh\OneDrive\Documentos\draft-copa-do-mundo-2026\All-PlayersID-FC26")
SCRIPT_DIR = Path(r"C:\Users\guilh\OneDrive\Documentos\draft-copa-do-mundo-2026")

def norm(s):
    s = unicodedata.normalize("NFD", str(s))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.lower().strip()

def words(s):
    return set(w for w in norm(s).split() if len(w) > 1)

def match_score(ref_name, fifa_nc):
    rw = words(ref_name)
    fw = words(fifa_nc)
    if not rw or not fw: return 0
    common = rw & fw
    return len(common) / max(len(rw), 1)

# ============================================================
# Ler posicoes do squad file
# ============================================================
PAIS_TO_TEAMFILE = {
    "argentina": "1369 - Argentina",
    "marrocos": "111111 - Morocco",
    "brasil": "1370 - Brazil",
    "franca": "1335 - France",
    "cabo verde": "111456 - Cabo Verde",
    "croacia": "1328 - Croatia",
    "egito": "111130 - Egypt",
    "tunisia": "1391 - Tunisia",
    "turquia": "1365 - Türkiye",
    "coreia do sul": "974 - Korea Republic",
    "republica tcheca": "1330 - Czech Republic",
    "bosnia e herzegovina": "105013 - Bosnia & Herzegovina",
    "colombia": "111109 - Colombia",
    "portugal": "1354 - Portugal",
    "haiti": "112048 - Haiti",
    "japao": "1411 - Japan",
    "mexico": "1386 - Mexico",
    "arabia saudita": "111114 - Saudi Arabia",
    "espanha": "1362 - Spain",
    "uruguai": "1377 - Uruguay",
}

def read_team_file(filepath):
    with open(filepath, "r", encoding="utf-16-le", errors="replace") as f:
        content = f.read()
    lines = content.splitlines()
    if not lines: return {}
    header = [c.strip() for c in lines[0].split("\t")]
    result = {}
    for line in lines[1:]:
        if not line.strip(): continue
        parts = [c.strip() for c in line.split("\t")]
        row = dict(zip(header, parts))
        pid = row.get("playerid","").strip()
        if pid and pid.isdigit():
            result[pid] = {
                "position": row.get("Position",""),
                "firstname": row.get("firstname",""),
                "lastname": row.get("lastname",""),
            }
    return result

pid_info = {}
for pais, teamfile in PAIS_TO_TEAMFILE.items():
    fpath = next((f for f in ALL_DIR.iterdir()
                  if f.suffix == ".txt" and norm(f.stem) == norm(teamfile)), None)
    if fpath:
        pid_info.update(read_team_file(fpath))

POS_ORDER = {"GK": 0, "DF": 1, "MF": 2, "FW": 3}
FC26_TO_FIFA = {
    "GK": "GK",
    "CB": "DF", "LB": "DF", "RB": "DF", "LWB": "DF", "RWB": "DF",
    "CDM": "MF", "CM": "MF", "CAM": "MF", "LM": "MF", "RM": "MF",
    "ST": "FW", "LW": "FW", "RW": "FW", "CF": "FW", "SS": "FW",
}
def pos_key(p): return POS_ORDER.get(p, 2)
def fc26_pos_key(p): return POS_ORDER.get(FC26_TO_FIFA.get(p, "MF"), 2)

# ============================================================
# MAPEAMENTOS EXATOS
# ============================================================
EXACT_MAPS = {
    "mexico": [
        ("Raul Rangel", "73325"),
        ("Mateo Chavez", "78784"),
        ("Gilberto Mora", "79399"),
        ("Armando Gonzalez", "84061"),
        ("Guillermo Ochoa", "140233"),
        ("Raul Jimenez", "204838"),
        ("Guillermo Martinez", "221293"),
        ("Luis Chavez", "222382"),
        ("Orbelin Pineda", "224574"),
        ("Jesus Gallardo", "226045"),
        ("Cesar Montes", "229980"),
        ("Alexis Vega", "233260"),
        ("Jorge Sanchez", "233493"),
        ("Julian Quinones", "234579"),
        ("Carlos Acevedo", "235183"),
        ("Edson Alvarez", "235844"),
        ("Roberto Alvarado", "237043"),
        ("Luis Romo", "243015"),
        ("Johan Vasquez", "244349"),
        ("Santiago Gimenez", "245152"),
        ("Cesar Huerta", "246289"),
        ("Fidalgo", "246608"),
        ("Israel Reyes", "252008"),
        ("Erik Lira", "257784"),
        ("Brian Gutierrez", "260984"),
        ("Obed Vargas", "263701"),
    ],
    "arabia saudita": [
        ("Mohammed Abu Al Shamat", "74436"),
        ("Jehad Thekri", "74699"),
        ("Ahmed Al Kassar", "209027"),
        ("Salem Al Dawsari", "210602"),
        ("Hassan Kadish", "210843"),
        ("Mohammed Al Owais", "210923"),
        ("Saleh Al Shehri", "211173"),
        ("Mohammed Kanno", "220075"),
        ("Sultan Mandash", "225976"),
        ("Ali Lajami", "228783"),
        ("Alaa Al Hajji", "231801"),
        ("Abdullah Al Khaibari", "237721"),
        ("Firas Al Birekan", "238545"),
        ("Abdulelah Al Amri", "241197"),
        ("Nasser Al Dawsari", "241938"),
        ("Abdullah Al Hamdan", "242223"),
        ("Ali Majrashi", "242506"),
        ("Hassan Tombakti", "245751"),
        ("Saud Abdulhamid", "246688"),
        ("Khaled Al Ghannam", "248498"),
        ("Ayman Yahya", "253440"),
        ("Nawaf Boushal", "254685"),
        ("Nawaf Al Aqidi", "255368"),
        ("Muteb Al Harbi", "256331"),
        ("Ziyad Al Johani", "263182"),
        ("Musab Al Juwair", "263824"),
    ],
    "espanha": [
        ("Victor Munoz", "76042"),
        ("Grimaldo", "100235"),
        ("Aymeric Laporte", "212218"),
        ("David Raya", "220901"),
        ("Borja Iglesias", "224179"),
        ("Mikel Merino", "225193"),
        ("Marcos Llorente", "226161"),
        ("Fabian Ruiz", "226271"),
        ("Oyarzabal", "230142"),
        ("Unai Simon", "230869"),
        ("Rodri", "231866"),
        ("Marc Cucurella", "239231"),
        ("Ferran Torres", "241461"),
        ("Pedro Porro", "243576"),
        ("Dani Olmo", "244260"),
        ("Eric Garcia", "245037"),
        ("Zubimendi", "248148"),
        ("Pedri", "251854"),
        ("Nico Williams", "256516"),
        ("Alex Baena", "257279"),
        ("Yeremy Pino", "259377"),
        ("Joan Garcia", "259532"),
        ("Gavi", "264240"),
        ("Pubill", "266039"),
        ("Lamine Yamal", "277643"),
        ("Pau Cubarsi", "278046"),
    ],
    "uruguai": [
        ("Fernando Muslera", "182494"),
        ("Jose Maria Gimenez", "216460"),
        ("Guillermo Varela", "219914"),
        ("Sergio Rochet", "223690"),
        ("Rodrigo Aguirre", "224201"),
        ("Giorgian De Arrascaeta", "225645"),
        ("Rodrigo Bentancur", "227535"),
        ("Santiago Bueno", "237658"),
        ("Federico Valverde", "239053"),
        ("Nicolas De la Cruz", "240699"),
        ("Mathias Olivera", "240716"),
        ("Rodrigo Zalazar", "251377"),
        ("Juan Manuel Sanabria", "252326"),
        ("Brian Rodriguez", "253061"),
        ("Darwin Nunez", "253072"),
        ("Ronald Araujo", "253163"),
        ("Sebastian Caceres", "253257"),
        ("Agustin Canobbio", "253281"),
        ("Facundo Pellistri", "253283"),
        ("Matias Vina", "253290"),
        ("Manuel Ugarte", "253306"),
        ("Federico Vinas", "253385"),
        ("Joaquin Piquerez", "254623"),
        ("Maximiliano Araujo", "254817"),
        ("Emiliano Martinez", "255340"),
        ("Santiago Mele", "259259"),
    ],
    "coreia do sul": [
        ("Kim Seung Gyu", "191655"),
        ("Son Heung Min", "200104"),
        ("Jo Hyeon Woo", "212432"),
        ("Lee Jae Sung", "221671"),
        ("Hwang Hee Chan", "226380"),
        ("Kim Jin Gyu", "227659"),
        ("Hwang In Beom", "228010"),
        ("Kim Min Jae", "237086"),
        ("Paik Seung Ho", "237424"),
        ("Song Bum Keun", "238570"),
        ("Park Jin Seob", "243673"),
        ("Lee Kang In", "243780"),
        ("Kim Moon Hwan", "244800"),
        ("Lee Dong Gyeong", "245054"),
        ("Cho Gue Sung", "247686"),
        ("Oh Hyeon Gyu", "248712"),
        ("Kim Tae Hyeon", "252198"),
        ("Seol Young Woo", "254980"),
        ("Yang Hyun Jun", "260397"),
        ("Eom Ji Sung", "260492"),
        ("Lee Han Beom", "261062"),
        ("Lee Tae Seok", "261063"),
        ("Lee Gi Hyuk", "261128"),
        ("Jens Castrop", "264194"),
        ("Bae Jun Ho", "266774"),
        ("Cho Wi Je", "267401"),
    ],
    "iraque": [
        ("Faris Al Ramadi", "85449"),
        ("Mahdi Al Jazrawi", "85450"),
        ("Mustafa Bayrani", "85451"),
        ("Qusay Najafi", "85452"),
        ("Haitham Al Qarawli", "85453"),
        ("Bassel Al Furatani", "85454"),
        ("Hossam Al Babilawi", "85455"),
        ("Khalid Al Maysani", "85456"),
        ("Mohanad Habbani", "85457"),
        ("Raed Al Burjawi", "85458"),
        ("Firas Al Anbaruni", "85459"),
        ("Karim Al Anbaruni", "85460"),
        ("Karim Moslawi", "85461"),
        ("Saad Ubaidi", "85462"),
        ("Yasser Al Nahraniq", "85463"),
        ("Ammar Dijlawi", "85464"),
        ("Hakam Dijlawi", "85465"),
        ("Iyad Wasiti", "85466"),
        ("Adnan Rafidiqini", "85467"),
        ("Tawfiq Shattari", "85468"),
        ("Nader Al Habbani", "85469"),
        ("Tawfiq Daraji", "85470"),
        ("Diyan Qaysi", "85471"),
        ("Nabih Furatani", "85472"),
        ("Rayyan Nimri", "85473"),
        ("Walid Al Biblawi", "85474"),
    ],
    "argelia": [
        ("Massiren Ait Zefrane", "85344"),
        ("Amnay Ait Zekran", "85345"),
        ("Yacel Amrizi", "85346"),
        ("Younel Amzighar", "85347"),
        ("Lyes Amzouri", "85348"),
        ("Sofiane Belkourimi", "85349"),
        ("Samy Belouhane", "85350"),
        ("Zakaria Benhouariq", "85351"),
        ("Redouane Bensahriq", "85352"),
        ("Taha Bensouhane", "85353"),
        ("Nadil Boudrissane", "85355"),
        ("Hocem Boulazem", "85361"),
        ("Samir Bouzeyane", "85362"),
        ("Aferdis Imzuran", "85364"),
        ("Rayan Khelzani", "85365"),
        ("Younes Kherzani", "85366"),
        ("Walem Mefrane", "85367"),
        ("Imrane Mezouqri", "85368"),
        ("Melyaz Mourkane", "85369"),
        ("Fayezel Oumazrane", "85370"),
        ("Ziyad Oumrani", "85371"),
        ("Nadir Ouzrani", "85372"),
        ("Nail Zerhouni", "85373"),
        ("Faris Zerouaniq", "85374"),
        ("Imranech Belhamzine", "85375"),
        ("Bilal Boumezdar", "85376"),
    ],
    "curacao": [
        ("Tyrone Rafaela", "84294"),
        ("Ranger Eustacia", "84295"),
        ("Reangelo Heimers", "84296"),
        ("Ryan Rosamaria", "84297"),
        ("Jameson Albertus", "84298"),
        ("Rijairo Alexander", "84299"),
        ("Lalito Macks", "84300"),
        ("Sander Apolonia", "84301"),
        ("Romero van Rooi", "84302"),
        ("Cheto Merencia", "84303"),
        ("Elivelton Meulens", "84304"),
        ("Dairon Nigellus", "84305"),
        ("Jorge Anastatia", "84306"),
        ("Kelmer Martis", "84307"),
        ("Remy Fabricia", "84308"),
        ("Carlson de Ridder", "84309"),
        ("Gerandruw Manuel", "84310"),
        ("Joenathan Amelia", "84311"),
        ("Luuk Bernardina", "84312"),
        ("Roystin Schoop", "84313"),
        ("Claudemuner Andreia", "84314"),
        ("Dieguinho Scholten", "84315"),
        ("Jeromar Croes", "84316"),
        ("Quinton Josephia", "84317"),
        ("Elimarkus Henriquez", "84318"),
        ("Joniarty Jansen", "84320"),
    ],
    "republica tcheca": [
        ("Lukas Cerv", "71259"),
        ("Stepan Chaloupek", "73456"),
        ("Alexandr Sojka", "74419"),
        ("Denis Visinsky", "80073"),
        ("Hugo Sochurek", "86210"),
        ("Jaroslav Zeleny", "199323"),
        ("Vladimir Darida", "201262"),
        ("Jindrich Stanek", "221909"),
        ("Patrik Schick", "232236"),
        ("Tomas Soucek", "236792"),
        ("Matej Kovar", "242948"),
        ("Vladimir Coufal", "244470"),
        ("Tomas Chory", "244793"),
        ("Michal Sadilek", "245209"),
        ("Adam Hlozek", "246618"),
        ("Pavel Sulc", "247050"),
        ("Tomas Holes", "251116"),
        ("Ladislav Krejci", "252064"),
        ("Lukas Provod", "253727"),
        ("David Zima", "255687"),
        ("Jan Kuchta", "257536"),
        ("Lukas Hornicek", "258936"),
        ("David Jurasek", "267594"),
        ("David Doudera", "269509"),
        ("Mojmir Chytil", "274906"),
        ("Robin Hranac", "276646"),
    ],
    "bosnia e herzegovina": [
        ("Samed Bazdar", "72360"),
        ("Arjan Malic", "73113"),
        ("Jovo Lukic", "75209"),
        ("Kerim Alajbegovic", "75533"),
        ("Amar Memic", "76602"),
        ("Stjepan Radeljic", "84037"),
        ("Martin Zlomislic", "84039"),
        ("Ivan Basic", "84041"),
        ("Ermin Mahmic", "85688"),
        ("Mladen Jurkas", "86243"),
        ("Edin Dzeko", "180930"),
        ("Sead Kolasinac", "207993"),
        ("Haris Tabakovic", "212002"),
        ("Dzenis Burnic", "228082"),
        ("Amir Hadziahmetovic", "233053"),
        ("Dennis Hadzikadunić", "236541"),
        ("Ermedin Demirovic", "238900"),
        ("Nikola Katic", "244204"),
        ("Ivan Sunjic", "244271"),
        ("Nihad Mujakic", "251168"),
        ("Armin Gigovic", "251617"),
        ("Amar Dedic", "257345"),
        ("Tarik Muharemovic", "262027"),
        ("Nikola Vasilj", "262956"),
        ("Esmir Bajraktarevic", "269823"),
        ("Benjamin Tahirovic", "272596"),
    ],
    "colombia": [
        ("David Ospina", "176550"),
        ("James Rodriguez", "198710"),
        ("Santiago Arias", "204259"),
        ("Jhon Cordoba", "210287"),
        ("Juan Fernando Quintero", "210513"),
        ("Camilo Vargas", "212067"),
        ("Jefferson Lerma", "213991"),
        ("Johan Mojica", "214026"),
        ("Yerry Mina", "220523"),
        ("Davinson Sanchez", "220793"),
        ("Deiver Machado", "220837"),
        ("Jorge Carrascal", "225964"),
        ("Alvaro Montero", "229541"),
        ("Jhon Lucumi", "231207"),
        ("Cucho Hernandez", "237034"),
        ("Daniel Munoz", "237646"),
        ("Jaminton Campaz", "238230"),
        ("Luis Diaz", "241084"),
        ("Jhon Arias", "241602"),
        ("Luis Javier Suarez", "245158"),
        ("Willer Ditta", "245810"),
        ("Juan Camilo Portilla", "248191"),
        ("Richard Rios", "262881"),
        ("Andres Gomez", "266674"),
        ("Kevin Castano", "272951"),
        ("Gustavo Puerta", "273827"),
    ],
    "portugal": [
        ("Cristiano Ronaldo", "20801"),
        ("Rui Silva", "210385"),
        ("Joao Cancelo", "210514"),
        ("Bruno Fernandes", "212198"),
        ("Jose Sa", "212442"),
        ("Bernardo Silva", "218667"),
        ("Ruben Neves", "224293"),
        ("Guedes", "224411"),
        ("Nelson Semedo", "227928"),
        ("Diogo Dalot", "234574"),
        ("Diogo Costa", "234577"),
        ("Pedro Neto", "238616"),
        ("Ruben Dias", "239818"),
        ("Rafael Leao", "241721"),
        ("Joao Felix", "242444"),
        ("Trincao", "244778"),
        ("Nuno Mendes", "252145"),
        ("Matheus Nunes", "253124"),
        ("Vitinha", "255253"),
        ("Samu Costa", "255566"),
        ("Goncalo Ramos", "256903"),
        ("Goncalo Inacio", "257179"),
        ("Francisco Conceicao", "261050"),
        ("Tomas Araujo", "266096"),
        ("Joao Neves", "272834"),
        ("Renato Veiga", "273906"),
    ],
    "haiti": [
        ("Carl Fred Sainte", "73669"),
        ("Wilguens Pauguin", "78421"),
        ("Martin Experience", "78651"),
        ("Keeto Thermoncy", "82203"),
        ("Duke Lacroix", "82407"),
        ("Garven Metusala", "82408"),
        ("Josue Duverger", "82409"),
        ("Woodensky Pierre", "84610"),
        ("Dominique Simon", "85960"),
        ("Derrick Etienne Jr", "166539"),
        ("Johny Placide", "178363"),
        ("Duckens Nazon", "227573"),
        ("Carlens Arcus", "228591"),
        ("Jean-Kevin Duverne", "229705"),
        ("Yassin Fortune", "232500"),
        ("Jean-Ricner Bellegarde", "235456"),
        ("Hannes Delcroix", "237440"),
        ("Frantzdy Pierrot", "244949"),
        ("Wilson Isidor", "247335"),
        ("Don Deedson Louicius", "252416"),
        ("Alexandre Pierre", "259668"),
        ("Josue Casimir", "260943"),
        ("Lenny Joseph", "262652"),
        ("Ruben Providence", "264311"),
        ("Ricardo Ade", "265610"),
        ("Danley Jean Jacques", "268805"),
    ],
    "japao": [
        ("Kaishu Sano", "73078"),
        ("Kento Shiogai", "74879"),
        ("Keisuke Goto", "76570"),
        ("Yuto Nagatomo", "194359"),
        ("Ritsu Doan", "232639"),
        ("Daichi Kamada", "232730"),
        ("Koki Ogawa", "232829"),
        ("Junya Ito", "232905"),
        ("Takehiro Tomiyasu", "232938"),
        ("Ko Itakura", "233152"),
        ("Shogo Taniguchi", "233225"),
        ("Hiroki Ito", "234205"),
        ("Ao Tanaka", "236764"),
        ("Takefusa Kubo", "237681"),
        ("Keito Nakamura", "242914"),
        ("Yukinari Sugawara", "242916"),
        ("Keisuke Osako", "244654"),
        ("Shuto Machino", "245622"),
        ("Daizen Maeda", "246321"),
        ("Tsuyoshi Watanabe", "246826"),
        ("Ayumu Seko", "247264"),
        ("Ayase Ueda", "252162"),
        ("Yuito Suzuki", "255185"),
        ("Zion Suzuki", "255981"),
        ("Tomoki Hayakawa", "260847"),
        ("Junnosuke Suzuki", "266260"),
    ],
    "cabo verde": [
        ("Sidny Cabral", "70289"),
        ("Dailon Livramento", "73853"),
        ("Joao Paulo", "79254"),
        ("Marcio Rosa", "83505"),
        ("Yannick Semedo", "85971"),
        ("Kelvin Pires", "85973"),
        ("Ryan Mendes", "194847"),
        ("Stopira", "196902"),
        ("Roberto Lopes", "202014"),
        ("Garry Rodrigues", "210212"),
        ("Steven Moreira", "212401"),
        ("Vozinha", "217141"),
        ("Diney", "221706"),
        ("Nuno da Costa", "230857"),
        ("Jamiro Monteiro", "231150"),
        ("Deroy Duarte", "235355"),
        ("Willy Semedo", "242395"),
        ("Logan Costa", "243923"),
        ("Jovane Cabral", "244193"),
        ("Laros Duarte", "250893"),
        ("Telmo Arcanjo", "257194"),
        ("Benchimol", "263669"),
        ("CJ dos Santos", "267636"),
        ("Kevin Lenini", "269419"),
        ("Wagner Pina", "276909"),
        ("Helio Varela", "276923"),
    ],
    "croacia": [
        ("Toni Fruk", "77673"),
        ("Luka Modric", "177003"),
        ("Ivan Perisic", "181458"),
        ("Ante Budimir", "188335"),
        ("Mateo Kovacic", "207410"),
        ("Andrej Kramaric", "216354"),
        ("Mario Pasalic", "223273"),
        ("Duje Caleta-Car", "225263"),
        ("Marin Pongracic", "238370"),
        ("Nikola Vlasic", "241095"),
        ("Dominik Livakovic", "241671"),
        ("Nikola Moro", "244270"),
        ("Martin Erlic", "244456"),
        ("Petar Musa", "244797"),
        ("Dominik Kotarski", "246267"),
        ("Josip Stanisic", "250955"),
        ("Josko Gvardiol", "251517"),
        ("Josip Sutalo", "256325"),
        ("Kristijan Jakic", "257889"),
        ("Ivor Pandur", "258585"),
        ("Luka Sucic", "258775"),
        ("Igor Matanovic", "259750"),
        ("Marco Pasalic", "262740"),
        ("Martin Baturina", "262842"),
        ("Luka Vuskovic", "275192"),
        ("Petar Sucic", "276278"),
    ],
    "egito": [
        ("Marwan Attia", "81918"),
        ("Ibrahim Adel", "81958"),
        ("Hossam Abdelmaguid", "81960"),
        ("Mahmoud Saber", "82318"),
        ("Mohanad Lashin", "82329"),
        ("Ahmed Fatouh", "82400"),
        ("Donga", "83651"),
        ("Tarek Alaa", "85641"),
        ("Mahdy Soliman", "85642"),
        ("Mohamed Alaa", "85643"),
        ("Mostafa Zico", "86105"),
        ("Hamza Abdelkarim", "86106"),
        ("Mohamed Salah", "209331"),
        ("Ramy Rabia", "220380"),
        ("Zizo", "222537"),
        ("Karim Hafez", "224198"),
        ("Trezeguet", "226078"),
        ("Mohamed El Shenawy", "228182"),
        ("Haissem Hassan", "245870"),
        ("Mohamed Hany", "254252"),
        ("Hamdy Fathy", "254254"),
        ("Omar Marmoush", "256675"),
        ("Yasser Ibrahim", "261624"),
        ("Emam Ashour", "261742"),
        ("Mostafa Shobeir", "269161"),
        ("Mohamed Abdelmonem", "269164"),
    ],
    "tunisia": [
        ("Rayan Elloumi", "79903"),
        ("Adem Arous", "81410"),
        ("Hazem Mastouri", "82200"),
        ("Sabri Ben Hassen", "82781"),
        ("Abdelmouhib Chamakh", "84595"),
        ("Raed Chikhaoui", "84597"),
        ("Mohamed Amine Ben Hamida", "84599"),
        ("Khalil Ayari", "84604"),
        ("Rani Khedira", "211999"),
        ("Ellyes Skhiri", "225126"),
        ("Dylan Bronn", "235565"),
        ("Yan Valery", "236316"),
        ("Montassar Talbi", "245410"),
        ("Ali Abdi", "252711"),
        ("Anis Ben Slimane", "255210"),
        ("Firas Chaouat", "255569"),
        ("Sebastian Tounekti", "256383"),
        ("Omar Rekik", "258033"),
        ("Hannibal", "258171"),
        ("Ismael Gharbi", "263194"),
        ("Mortadha Ben Ouanes", "263432"),
        ("Elias Achouri", "263672"),
        ("Mohamed Belhadj Mahmoud", "264705"),
        ("Aymen Dahmen", "268825"),
        ("Elias Saad", "274000"),
        ("Moutaz Neffati", "279056"),
    ],
    "turquia": [
        ("Mert Gunok", "190113"),
        ("Kaan Ayhan", "207790"),
        ("Hakan Calhanoglu", "208128"),
        ("Zeki Celik", "224490"),
        ("Irfan Can Kahveci", "225403"),
        ("Ugurcan Cakir", "226300"),
        ("Abdulkerim Bardakci", "229905"),
        ("Caglar Soyuncu", "232119"),
        ("Ferdi Kadioglu", "235152"),
        ("Salih Ozcan", "235407"),
        ("Merih Demiral", "238160"),
        ("Ozan Kabak", "239890"),
        ("Yunus Akgun", "239892"),
        ("Orkun Kokcu", "243245"),
        ("Mert Muldur", "243526"),
        ("Altay Bayindir", "243647"),
        ("Kerem Akturkoglu", "258580"),
        ("Eren Elmali", "259754"),
        ("Ismail Yuksek", "260466"),
        ("Samet Akaydin", "263021"),
        ("Baris Alper Yilmaz", "263205"),
        ("Oguz Aydin", "264001"),
        ("Arda Guler", "264309"),
        ("Can Uzun", "275328"),
        ("Kenan Yildiz", "277954"),
        ("Deniz Gul", "278587"),
    ],
    "argentina": [
        ("Lionel Messi", "158023"),
        ("Nicolas Otamendi", "192366"),
        ("Emiliano Martinez", "202811"),
        ("Leandro Paredes", "207439"),
        ("Nicolas Tagliafico", "211256"),
        ("Rodrigo De Paul", "212616"),
        ("Juan Musso", "214979"),
        ("Geronimo Rulli", "215316"),
        ("Giovani Lo Celso", "226226"),
        ("Gonzalo Montiel", "231340"),
        ("Lautaro Martinez", "231478"),
        ("Exequiel Palacios", "231521"),
        ("Cristian Romero", "232488"),
        ("Nahuel Molina", "233084"),
        ("Marcos Senesi", "235606"),
        ("Facundo Medina", "236804"),
        ("Lisandro Martinez", "239301"),
        ("Alexis Mac Allister", "239837"),
        ("Nico Gonzalez", "240690"),
        ("Thiago Almada", "245371"),
        ("Julian Alvarez", "246191"),
        ("Enzo Fernandez", "247090"),
        ("Giuliano", "253396"),
        ("Jose Manuel Lopez", "261176"),
        ("Valentin Barco", "263370"),
        ("Nico Paz", "277846"),
    ],
    "marrocos": [
        ("Gessime Yassine", "70017"),
        ("Ayoube Amimiouni", "78474"),
        ("Youssef Belammari", "82240"),
        ("Yassine Bounou", "209981"),
        ("Munir El Kajoui", "223573"),
        ("Sofyan Amrabat", "224158"),
        ("Brahim", "231410"),
        ("Issa Diop", "231633"),
        ("Achraf Hakimi", "235212"),
        ("Marwane Saadane", "235890"),
        ("Noussair Mazraoui", "236401"),
        ("Ahmed Reda Tagnaouti", "241777"),
        ("Ayoub El Kaabi", "243586"),
        ("Azzedine Ounahi", "255125"),
        ("Bilal El Khannouss", "257504"),
        ("Chadi Riad", "258490"),
        ("Ismael Saibari", "259480"),
        ("Neil El Aynaoui", "262745"),
        ("Soufiane Rahimi", "264348"),
        ("Redouane Halhal", "264657"),
        ("Anass Salah-Eddine", "268728"),
        ("Amine Sbai", "273666"),
        ("Chemsdine Talbi", "275048"),
        ("Zakaria El Ouahdi", "275353"),
        ("Ayyoub Bouaddi", "278901"),
        ("Samir El Mourabet", "279702"),
    ],
    "brasil": [
        ("Rayan", "83494"),
        ("Weverton", "186555"),
        ("Neymar Jr", "190871"),
        ("Alex Sandro", "191043"),
        ("Danilo", "199304"),
        ("Casemiro", "200145"),
        ("Marquinhos", "207865"),
        ("Fabinho", "209499"),
        ("Ederson", "210257"),
        ("Douglas Santos", "210822"),
        ("Alisson", "212831"),
        ("Leo Pereira", "222895"),
        ("Gabriel", "232580"),
        ("Raphinha", "233419"),
        ("Lucas Paqueta", "233927"),
        ("Vini Jr", "238794"),
        ("Bremer", "239580"),
        ("Matheus Cunha", "240243"),
        ("Ibanez", "247257"),
        ("Bruno Guimaraes", "247851"),
        ("Gabriel Martinelli", "251566"),
        ("Luiz Henrique", "264698"),
        ("Ederson Soares", "266866"),  # Éderson (Ath. Mineiro)
        ("Endrick", "272505"),
        ("Danilo Santos", "273106"),
        ("Igor Thiago", "275771"),
    ],
    "franca": [
        ("Lucas Digne", "200458"),
        ("Brice Samba", "204883"),
        ("Adrien Rabiot", "210008"),
        ("Mike Maignan", "215698"),
        ("N'Golo Kante", "215914"),
        ("Lucas Hernandez", "220814"),
        ("Marcus Thuram", "228093"),
        ("Dayot Upamecano", "229558"),
        ("Ousmane Dembele", "231443"),
        ("Kylian Mbappe", "231747"),
        ("Theo Hernandez", "232656"),
        ("Jean-Philippe Mateta", "236461"),
        ("Ibrahima Konate", "237678"),
        ("Jules Kounde", "241486"),
        ("Aurelien Tchouameni", "241637"),
        ("William Saliba", "243715"),
        ("Maxence Lacroix", "244067"),
        ("Michael Olise", "247827"),
        ("Kouadio Manu Kone", "250723"),
        ("Rayan Cherki", "251570"),
        ("Malo Gusto", "259307"),
        ("Bradley Barcola", "264652"),
        ("Maghnes Akliouche", "264862"),
        ("Warren Zaire-Emery", "270673"),
        ("Desire Doue", "271421"),
        ("Robin Risser", "271918"),
    ],
}

# ============================================================
# Carregar jogadores_final.json
# ============================================================
print("Carregando jogadores_final.json...")
with open(SCRIPT_DIR / "jogadores_final.json", encoding="utf-8") as f:
    data = json.load(f)

total_mudancas = 0

for pais_key, mapa in EXACT_MAPS.items():
    jogadores_pais = [j for j in data if norm(j["pais"]) == pais_key]
    print(f"\n=== {pais_key.upper()} ({len(jogadores_pais)} jog | {len(mapa)} pids) ===")

    # Limpar todos os IDs do pais
    for j in jogadores_pais:
        j["playerid"] = None
        j["_match"] = "a_reatribuir"

    used = set()
    pid_to_ref = {pid: ref for ref, pid in mapa}

    # Fase 1: match por nome
    unmatched = []
    for j in jogadores_pais:
        nc = j.get("nome_completo", "")
        best_score = 0
        best_pid = None
        best_ref = None
        for ref_name, ref_pid in mapa:
            if ref_pid in used: continue
            s = match_score(ref_name, nc)
            if s > best_score:
                best_score = s
                best_pid = ref_pid
                best_ref = ref_name

        if best_pid and best_score >= 0.5:
            j["playerid"] = best_pid
            j["_match"] = f"exact_{best_score:.2f}"
            used.add(best_pid)
            total_mudancas += 1
            print(f"  [{best_score:.2f}] {nc} -> {best_ref} (pid={best_pid})")
        else:
            unmatched.append(j)

    # Fase 2: posicional para os sem match
    if unmatched:
        pids_disponiveis = [pid for _, pid in mapa if pid not in used]
        print(f"  Sem match: {len(unmatched)} | pids restantes: {len(pids_disponiveis)}")
        for j in sorted(unmatched, key=lambda j: pos_key(j.get("posicao","MF"))):
            pos_fifa = j.get("posicao","MF")
            po = pos_key(pos_fifa)
            best_pid = None
            best_dist = 99
            for pid in pids_disponiveis:
                if pid in used: continue
                fc26_pos = pid_info.get(pid, {}).get("position","CM")
                dist = abs(fc26_pos_key(fc26_pos) - po)
                if dist < best_dist:
                    best_dist = dist
                    best_pid = pid
            if best_pid:
                j["playerid"] = best_pid
                j["_match"] = f"exact_pos_{pos_fifa}"
                used.add(best_pid)
                total_mudancas += 1
                print(f"  [pos] {j['nome_completo']} ({pos_fifa}) -> pid={best_pid}")
            else:
                print(f"  SEM PID: {j['nome_completo']}")

# ============================================================
# Verificar duplicados
# ============================================================
pid_cnt = defaultdict(list)
for j in data:
    if j.get("playerid"):
        pid_cnt[j["playerid"]].append(j)
dup = {p: js for p, js in pid_cnt.items() if len(js) > 1}

total_com = sum(1 for j in data if j.get("playerid"))
total_sem = len(data) - total_com

print(f"\n=== RESULTADO ===")
print(f"  Mudancas: {total_mudancas}")
print(f"  Total com ID: {total_com}/{len(data)}")
print(f"  Sem ID: {total_sem}")
print(f"  Duplicados: {len(dup)}")
if dup:
    for pid, js in dup.items():
        print(f"  pid={pid}: {[j['nome_completo'] for j in js]}")
if total_sem:
    for j in data:
        if not j.get("playerid"):
            print(f"  sem id: {j['nome_completo']} ({j['pais']})")

with open(SCRIPT_DIR / "jogadores_final.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("\nSalvo: jogadores_final.json")
