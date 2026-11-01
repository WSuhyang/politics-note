// 전체 확장: 인물+37, 관계+30(detail 포함), 정책+14, 공약+5 — 일회성 (temp → mv)
const fs = require("fs");

// ============ 1) 인물 ============
const persons = JSON.parse(fs.readFileSync("data/persons.json", "utf8"));
// 기존 인물 role 부여
const roleOf = {
  "이승만":"대통령","윤보선":"대통령","박정희":"대통령","최규하":"대통령","전두환":"대통령","노태우":"대통령",
  "김영삼":"대통령","김대중":"대통령","노무현":"대통령","이명박":"대통령","박근혜":"대통령","문재인":"대통령",
  "윤석열":"대통령","이재명":"대통령",
  "김종필":"총리·장관","허정":"총리·장관","장면":"총리·장관","한덕수":"총리·장관","황교안":"총리·장관",
  "이낙연":"총리·장관","정세균":"총리·장관","김부겸":"총리·장관","이상민":"총리·장관","한동훈":"총리·장관",
  "추미애":"총리·장관","박범계":"총리·장관","조국":"총리·장관",
  "우원식":"국회의원","김기현":"국회의원","이준석":"국회의원","나경원":"국회의원","안철수":"국회의원",
  "주호영":"국회의원","김한길":"국회의원","박지원":"국회의원","유승민":"국회의원","김문수":"지방단체장",
  "홍준표":"지방단체장","오세훈":"지방단체장","송영길":"지방단체장"
};
persons.nodes.forEach(p => { if (roleOf[p.id]) p.role = roleOf[p.id]; });

const addPersons = [
 {id:"김구",camp:"mid",born:1876,died:1949,role:"독립·건국",party:"한국독립당",event:"암살(1949)",edu:"배재학당 · 임시정부 주석"},
 {id:"신익희",camp:"dem",born:1893,died:1955,role:"독립·건국",party:"민국당→민주당",edu:"일본 메이지대 · 민주당 초대 총재"},
 {id:"조병옥",camp:"dem",born:1894,died:1960,role:"독립·건국",party:"민주당",edu:"연희전문 · 민주당 최고위원"},
 {id:"장택상",camp:"con",born:1893,died:1969,role:"총리·장관",party:"자유당→공화당",edu:"중국 강무학교 · 외무장관·국무총리"},
 {id:"유진산",camp:"dem",born:1925,died:1974,role:"국회의원",party:"신민당",event:"서거(재임중)",edu:"서울대 법학 · 신민당 총재"},
 {id:"이후락",camp:"con",born:1924,died:2013,role:"총리·장관",party:"민주공화당",edu:"서울대 정외 · 중앙정보부장·총리서리"},
 {id:"차지철",camp:"con",born:1915,died:1979,role:"국회의원",party:"민주공화당",event:"10·26 피살",edu:"육사 · 박정희 비서실장"},
 {id:"김재규",camp:"con",born:1926,died:1980,role:"총리·장관",party:"민주공화당",event:"박정희 암살 후 처형",edu:"육사 · 중앙정보부장"},
 {id:"박태준",camp:"con",born:1927,died:2011,role:"총리·장관",party:"민주자유당",edu:"도쿄대 · 포항제철 창립·국무총리"},
 {id:"이수성",camp:"con",born:1936,role:"총리·장관",party:"민주자유당→신한국당",edu:"서울대 경제 · 국무총리·국회의장"},
 {id:"이회창",camp:"con",born:1935,role:"국회의원",party:"한나라당(대선후보 2회)",edu:"서울대 법학 · 감사원장·대법관"},
 {id:"조순",camp:"con",born:1934,role:"지방단체장",party:"신한국당(대표)",edu:"서울대 경제 · 서울시장·당대표"},
 {id:"정몽준",camp:"con",born:1951,role:"국회의원",party:"국민의힘",edu:"서울대·MIT · 국회의장(역)·새누리 대표"},
 {id:"김무성",camp:"con",born:1951,role:"국회의원",party:"새누리당(대표)",edu:"고려대 경제 · 새누리당 대표"},
 {id:"박희태",camp:"con",born:1938,role:"국회의원",party:"한나라당",edu:"육사·한양대 · 국회의장(2010~12)"},
 {id:"이해찬",camp:"dem",born:1952,role:"총리·장관",party:"더불어민주당(대표)",edu:"서울대 사학 · 국무총리·교육부장관"},
 {id:"정동영",camp:"dem",born:1953,role:"총리·장관",party:"더불어민주당",edu:"고려대 신문학 · 국무총리·통일부장관"},
 {id:"천정배",camp:"dem",born:1953,role:"총리·장관",party:"민주당 계열",edu:"고려대 법학 · 법무부장관·원내대표"},
 {id:"김근태",camp:"dem",born:1947,died:2017,role:"총리·장관",party:"민주당 계열",edu:"서울대 사회 · 보건복지부장관·당대표"},
 {id:"박원순",camp:"dem",born:1956,died:2020,role:"지방단체장",party:"더불어민주당",event:"재임중 서거",edu:"서울대 법학 · 서울시장(3선)"},
 {id:"한명숙",camp:"dem",born:1944,role:"총리·장관",party:"열린우리당",edu:"이화여대 사학 · 국무총리(2006~07)"},
 {id:"강금실",camp:"dem",born:1963,role:"총리·장관",party:"열린우리당",edu:"서울대·독일 프라이부르크대 · 첫 여성 법무부장관"},
 {id:"심상정",camp:"mid",born:1959,role:"국회의원",party:"정의당(대표)",edu:"서울대 국사 · 정의당 대표·3선 의원"},
 {id:"노회찬",camp:"mid",born:1956,died:2018,role:"국회의원",party:"진보신당→민주평화당? (진보)",edu:"아주대 전자공학 · 진보 정치 상징"},
 {id:"원희룡",camp:"con",born:1964,role:"총리·장관",party:"국민의힘",edu:"제주대 · 국토교통부장관·제주지사"},
 {id:"남경필",camp:"con",born:1964,role:"지방단체장",party:"새누리당",edu:"서울대·펜실베이니아대 · 경기지사(2010~18)"},
 {id:"최문순",camp:"dem",born:1959,role:"지방단체장",party:"더불어민주당",edu:"고려대 신문학 · 강원지사(3선)·MBC 기자"},
 {id:"김동연",camp:"dem",born:1960,role:"지방단체장",party:"더불어민주당",edu:"중앙대 경영 · 기획재정부장관→경기지사"},
 {id:"박광온",camp:"dem",born:1961,role:"국회의원",party:"더불어민주당",edu:"서울대 사회 · 민주당 원내대표"},
 {id:"정청래",camp:"dem",born:1968,role:"국회의원",party:"더불어민주당",edu:"서울대 사회 · 친명계·법사위 간사"},
 {id:"김민석",camp:"dem",born:1964,role:"국회의원",party:"더불어민주당(대표)",edu:"서울대 사회 · 민주당 대표"},
 {id:"박찬대",camp:"dem",born:1967,role:"국회의원",party:"더불어민주당",edu:"연세대 경제 · 민주당 원내대표"},
 {id:"권성동",camp:"con",born:1961,role:"국회의원",party:"국민의힘",edu:"연세대 법학 · 국힘 원내대표·비대위 대변인"},
 {id:"하태경",camp:"con",born:1968,role:"국회의원",party:"국민의힘",edu:"서울대 외교 · 비윤계·친한동훈"},
 {id:"박지현",camp:"dem",born:1988,role:"국회의원",party:"더불어민주당",edu:"연세대 · 비례의원·비명계"},
 {id:"박영선",camp:"dem",born:1962,role:"총리·장관",party:"더불어민주당",edu:"서울대 영문 · 중기부장관·서울시장 권한대행"},
 {id:"이인영",camp:"dem",born:1964,role:"총리·장관",party:"더불어민주당",edu:"서울대 사회 · 통일부장관·당대표"}
];
persons.nodes.push(...addPersons);
fs.writeFileSync("data/persons_new.json", JSON.stringify(persons, null, 2));
console.log("인물:", persons.nodes.length);

// ============ 2) 관계 (detail 포함) ============
const rel = JSON.parse(fs.readFileSync("data/relations.json", "utf8"));
// 기존 가족·동문 관계에 detail 추가
const detailOf = {
  "박정희|박근혜":"박정희와 육영수 사이의 장녀. 1974년 육영수 피격 후 퍼스트레이디 역할을 맡으며 정치에 입문",
  "윤보선|장면":"제2공화국은 내각책임제 — 대통령(윤보선)은 상징적 국가원수, 실권은 국무총리(장면)에게",
  "노무현|문재인":"1982년 부산 합동법률사무소에서 인권 변론을 함께 시작. 노무현 사후 문재인이 정치 유산을 계승",
  "윤석열|한동훈":"2019년 윤석열 검찰총장 시절 서울중앙지검장·법무부 차관을 지낸 한동훈은 윤석열 정부 출범 후 법무부장관",
  "전두환|노태우":"육군사관학교 11기 동기 — 12·12 군사반란을 공동 주도한 신군부 핵심",
  "이승만|허정":"4·19로 이승만이 사임하자 외무부장관 허정이 권한대행으로 국정을 이끌며 제2공화국으로 이행",
  "이재명|김한길":"이재명(중앙대 법학과)과 김한길(중앙대 신문방송학과)은 동문 — 친명 진영의 원로·중진 역할"
};
rel.edges.forEach(e => {
  const k1 = e.source+"|"+e.target, k2 = e.target+"|"+e.source;
  if (detailOf[k1]) e.detail = detailOf[k1];
  else if (detailOf[k2]) e.detail = detailOf[k2];
});
rel.edges.push(
 {source:"김구",target:"이승만",relation:"단독정부 수립 대립",type:"rival",strength:3,since:1948,detail:"김구는 남북협상을 주장하며 단독정부에 반대 — 건국 노선의 대립. 1949년 안두희에게 피살"},
 {source:"신익희",target:"조병옥",relation:"민주당 공동 창당",type:"faction",strength:2,since:1955},
 {source:"신익희",target:"이승만",relation:"1956 대선 도전(사망으로 무산)",type:"rival",strength:2,since:1955},
 {source:"유진산",target:"김영삼",relation:"신민당 동료(YS의 정치적 스승)",type:"lineage",strength:2,since:1969,detail:"신민당 총재 유진산은 야당 신진 세력의 구심점 — 김영삼·김대중이 그 직계에서 성장"},
 {source:"장택상",target:"이승만",relation:"외무장관·내무장관 역임",type:"faction",strength:1,since:1948},
 {source:"이후락",target:"박정희",relation:"중앙정보부장(핵심 측근)",type:"faction",strength:3,since:1963},
 {source:"차지철",target:"박정희",relation:"비서실장(권력 2인자)",type:"faction",strength:3,since:1974,detail:"박정희의 최측근 비서실장. 1979년 10·26 당시 김재규의 총에 함께 피살"},
 {source:"김재규",target:"박정희",relation:"10·26 — 측근의 암살",type:"rival",strength:3,since:1979,detail:"중앙정보부장 김재규가 1979.10.26 궁정동에서 박정희를 사살 — 유신 독재의 극적 종말"},
 {source:"박태준",target:"박정희",relation:"포항제철 설립(경제개발 파트너)",type:"faction",strength:2,since:1968},
 {source:"이수성",target:"김영삼",relation:"국무총리 임명",type:"faction",strength:2,since:1995},
 {source:"이회창",target:"김영삼",relation:"여권 차기 주자 → 97 대선후보",type:"lineage",strength:2,since:1996,detail:"YS는 이회창을 차기 후보로 지원했으나 1997년 DJ에게 패배 — 보수의 10년 야당 시대 시작"},
 {source:"이회창",target:"이명박",relation:"2007 한나라당 경선 라이벌",type:"rival",strength:2,since:2007},
 {source:"정몽준",target:"박원순",relation:"2011 서울시장 보궐 라이벌",type:"rival",strength:2,since:2011,detail:"야권 단일화로 박원순이 후보로 나서 안철수의 지지를 등에 업고 당선 — 정몽준 낙선"},
 {source:"김무성",target:"박근혜",relation:"친박 → 2015 갈등(비박 전환)",type:"faction",strength:2,since:2012},
 {source:"박희태",target:"이명박",relation:"MB 정부 국회의장·핵심",type:"faction",strength:2,since:2008},
 {source:"이해찬",target:"노무현",relation:"교육부장관·청와대 비서실장",type:"faction",strength:2,since:2003},
 {source:"정동영",target:"노무현",relation:"통일부장관(15대 당 대표)",type:"faction",strength:2,since:2004},
 {source:"천정배",target:"노무현",relation:"법무부장관·원내대표",type:"faction",strength:2,since:2003},
 {source:"김근태",target:"노무현",relation:"보건복지부장관·당 대표",type:"faction",strength:2,since:2004},
 {source:"박원순",target:"문재인",relation:"민주당 계열 서울시장(참여연대 동료)",type:"faction",strength:2,since:2011,detail:"박원순과 문재인은 참여연대 시절부터 인권 변호사 네트워크로 연결"},
 {source:"한명숙",target:"노무현",relation:"국무총리 임명",type:"faction",strength:2,since:2006},
 {source:"강금실",target:"노무현",relation:"첫 여성 법무부장관",type:"faction",strength:2,since:2003},
 {source:"심상정",target:"문재인",relation:"2017 대선 3자 구도",type:"rival",strength:1,since:2017},
 {source:"노회찬",target:"노무현",relation:"진보 진영 동맹(2002 지지선언)",type:"faction",strength:1,since:2002},
 {source:"원희룡",target:"박근혜",relation:"국토교통부장관",type:"faction",strength:2,since:2013},
 {source:"남경필",target:"이명박",relation:"한나라당 경기지사",type:"faction",strength:2,since:2010},
 {source:"최문순",target:"노무현",relation:"참여정부 청와대 대변인",type:"faction",strength:1,since:2003},
 {source:"김동연",target:"문재인",relation:"기획재정부장관",type:"faction",strength:2,since:2017},
 {source:"박광온",target:"이재명",relation:"민주당 원내대표(친명 협치)",type:"faction",strength:2,since:2024},
 {source:"정청래",target:"이재명",relation:"친명계 핵심",type:"faction",strength:2,since:2022},
 {source:"김민석",target:"이재명",relation:"민주당 대표(친명)",type:"faction",strength:2,since:2025},
 {source:"박찬대",target:"이재명",relation:"민주당 원내대표",type:"faction",strength:2,since:2025},
 {source:"권성동",target:"윤석열",relation:"국힘 원내대표·비대위 대변인(친윤)",type:"faction",strength:2,since:2022},
 {source:"하태경",target:"한동훈",relation:"친한(비윤) 동맹",type:"faction",strength:1,since:2024},
 {source:"박지현",target:"이재명",relation:"비명계 젊은 의원",type:"rival",strength:1,since:2022},
 {source:"박영선",target:"문재인",relation:"중소벤처기업부장관",type:"faction",strength:2,since:2019},
 {source:"이인영",target:"문재인",relation:"통일부장관·당 대표",type:"faction",strength:2,since:2017}
);
fs.writeFileSync("data/relations_new.json", JSON.stringify(rel, null, 2));
console.log("관계:", rel.edges.length);

// ============ 3) 정책 +14 ============
const pol = JSON.parse(fs.readFileSync("data/policies.json", "utf8"));
pol.policies.push(
 {id:"medins",title:"전국민 의료보험 도입",cat:"복지",politicians:["박정희"],year:1977,period:"1977~1989",status:"완료",
  summary:"직장·지역 의료보험으로 전국민 의료보장을 시작 — '면허도 없던 국가'가 만든 복지 기적.",
  bg:"의료 접근성 양극화 — 개발 시기 복지 후순위 관행 타파.",
  content:"1977년 직장의료보험 시작, 1989년 전국민 확대(전두환~노태우 정부 완성).",
  result:"OECD 최단 기간 전국민 의료보험 달성 — 한국 복지 체계의 뼈대.",
  src:"위키백과 '대한민국의 건강보험'"},
 {id:"pension",title:"국민연금 도입",cat:"복지",politicians:["전두환","노태우"],year:1988,period:"1988~현재",status:"계승",
  summary:"노후 소득 보장을 위한 사회보험 — 1988년 직장 가입에서 전국민 연금으로.",
  bg:"고령화 대비와 개발 국가의 사회 안정 논리.",
  content:"1988년 10인 이상 사업장 시작, 1995년 농어촌, 1999년 전국민연금.",
  result:"기초연금·퇴직연금으로 확장. 저부담·고급여 구조의 재정 논란 지속.",
  src:"위키백과 '국민연금'"},
 {id:"info1998",title:"정보화 기본계획(초고속 인터넷)",cat:"산업·과학",politicians:["김대중"],year:1998,period:"1998~2005",status:"완료",
  summary:"세계 최고 초고통 인터넷 강국의 기초를 만든 정보화 정책.",
  bg:"IMF 위기 극복의 신성장 동력 모색.",
  content:"CDMA·초고속 인터넷 인프라 투자, PC방 확산, IT 강국 전략.",
  result:"2000년대 초 세계 1위 초고속망 보급 — IT·게임·플랫폼 산업의 토대.",
  src:"위키백과 '정보화 기본계획'"},
 {id:"imf-reform",title:"IMF 구조조정(기업·금융 개혁)",cat:"경제",politicians:["김대중"],year:1998,period:"1998~2002",status:"완료",
  summary:"IMF 구제금융 조건 아래 대기업·금융 구조조정 — '대마불사'의 종언.",
  bg:"외환위기 — 단기외채 과다와 재벌 구조의 붕괴.",
  content:"기업 구조조정(워크아웃), 금융감독체계 개편, 외국인 투자 개방, 노사정위.",
  result:"2년 만에 조기 졸업. 재벌 개혁은 부분적 — 이후 '총수 체제' 논쟁 지속.",
  src:"위키백과 '1997년 대한민국 구제금융 사건'"},
 {id:"nonregular",title:"비정규직 보호법(기간제·파견법)",cat:"노동",politicians:["노무현"],year:2007,period:"2006~2007",status:"일부수정",
  summary:"비정규직 차별 시정을 최초로 법제화 — 동시에 고용 유연화 허용.",
  bg:"비정규직 비율 급증(50%대) — 보호와 유연성의 트레이드오프.",
  content:"2년 후 무기직 전환(기간제법), 파견 허용 업종 확대 — 노동계 내부에서도 평가 엇갈림.",
  result:"무기전환 100만명+ 달성. 3년 미만 사용 후 해지(면책) 논란은 현재까지 지속.",
  src:"위키백과 '기간제 및 단시간근로자 보호 등에 관한 법률'"},
 {id:"freemeal",title:"무상급식 전면 확대 논쟁",cat:"복지",politicians:["오세훈"],year:2010,period:"2010~2011",status:"논란",
  summary:"무상급식을 둘러싼 보편복지 vs 선별복지 대결 — 오세훈 서울시장 재신임 투표 사퇴로 끝난 갈등.",
  bg:"경남 교육감 선거 무상급식 공약이 전국으로 번짐 — 나경원 한나라당 대표 '무상급식 반대' 발언 파문.",
  content:"오세훈은 50% 선별 지원안으로 주민투표 추진 — 투표율 미달로 재신임 묻는 자리에서 사퇴.",
  result:"박원순 보궐 당선 — 무상급식 전면 확대. 2012년 총선·대선 보편복지 공약 확산의 전환점.",
  src:"위키백과 '2011년 서울특별시장 재보궐선거'"},
 {id:"wk52",title:"주 52시간 근무제",cat:"노동",politicians:["문재인"],year:2018,period:"2018~현재",status:"일부수정",
  summary:"주 52시간 상한제 — 일·생활 균형과 과로사 예방의 상징적 제도.",
  bg:"장시간 노동 OECD 최하위권 수준 — 과로사·저출산 논의.",
  content:"2018년 300인 이상→2021년 전 사업장 확대. 연장·야간·휴일 가산수당 강화.",
  result:"총노동시간 감소 추세. 특정 업종 예외·유연화 논란은 윤석열 정부에서 재점화.",
  src:"위키백과 '주 52시간 근무제'"},
 {id:"childallow",title:"아동수당·아동급여",cat:"복지",politicians:["문재인"],year:2018,period:"2018~현재",status:"계승",
  summary:"만 8세 이하 아동에게 월 10만 원 지급 — 보편 아동 복지의 시작.",
  bg:"저출산 대책과 복지 국가 확장 요구.",
  content:"2018 아동수당 도입 → 윤석열 정부에서 부모급여(0~1세 월 100만→70만)로 확장·조정.",
  result:"아동 복지 지출 구조 변화 — 정권마다 급여 명칭·액수 조정 반복.",
  src:"위키백과 '아동수당'"},
 {id:"prosec-reform",title:"검경 수사권 조정",cat:"정치개혁",politicians:["문재인"],year:2020,period:"2020~현재",status:"일부수정",
  summary:"검찰의 1차적 수사권을 경찰에 이관 — 70년 만의 수사권 재편.",
  bg:"검찰 개혁 공약 — 기소·수사 겸직 비판.",
  content:"2020년 법 개정으로 검찰 직접수사 축소, 경찰 수사 독립(수사심의위). 윤석열 정부에서 재조정(검찰 수사권 일부 회복).",
  result:"수사·기소 분리 논쟁의 핵심 — 공수처와 함께 사법개혁의 최대 쟁점.",
  src:"위키백과 '검경 수사권 조정'"},
 {id:"disaster",title:"재난지원금(코로나 소득보전)",cat:"복지",politicians:["문재인"],year:2020,period:"2020~2021",status:"완료",
  summary:"전국민 4인 가구 100만 원 긴급재난지원금 — 재난 소득 보전의 첫 전례.",
  bg:"코로나19 봉쇄로 소득 급감 — 소비 하락 방어.",
  content:"1차 전국민 지급(14.3조), 2~5차 소상공인·피해업종 집중 지원.",
  result:"K-방역과 함께 위기 대응 모델로 평가. 재정 부담과 선별 기준 논란.",
  src:"위키백과 '긴급재난지원금'"},
 {id:"carbon2050",title:"2050 탄소중립 선언",cat:"환경·에너지",politicians:["문재인"],year:2020,period:"2020~현재",status:"계승",
  summary:"2050 온실가스 순 배출 제로 선언 — 이행 비용의 사활이 걸린 국가 목표.",
  bg:"파리협정 이행 — 기후 위기 대응 국제 의무.",
  content:"2020년 선언, 2030 NDC 40% 감축 상향. 2050 탄소중립 기본법 제정.",
  result:"산업 구조조정 비용·석탄 지역 대책이 최대 현안 — 윤석열 정부도 목표 유지(방식 수정).",
  src:"위키백과 '대한민국 2050 탄소중립'"},
 {id:"parentpay",title:"부모급여(0~1세 월 지급)",cat:"복지",politicians:["윤석열"],year:2022,period:"2022~현재",status:"진행",
  summary:"만 0세 월 70만 원·1세 35만 원 — 영유아 보육 현금 지원 강화.",
  bg:"저출산 심화 — 역대 최저 합계출산율.",
  content:"2023년 도입(0세 70만·1세 35만), 아동수당과 통합 논의 진행.",
  result:"영유아 가구 지원 확대 — 저출산 반전 효과는 아직 미지수.",
  src:"위키백과 '부모급여'"},
 {id:"leapacc",title:"청년도약계좌",cat:"복지",politicians:["윤석열"],year:2022,period:"2022~현재",status:"진행",
  summary:"청년 저축 지원(월 70만 원 납입에 정부 6~3.2% 가산) — 자산 형성 지원.",
  bg:"청년 주거·자산 격차 심화.",
  content:"2022년 출범 — 만 19~34세 소득·자산 요건 충족 시 5년 만기 수령.",
  result:"가입 확대 중 — '청년도약계좌+확대'가 이재명 정부 논의로 이어짐.",
  src:"위키백과 '청년도약계좌'"},
 {id:"coupon25",title:"민생회복 소비쿠폰",cat:"경제",politicians:["이재명"],year:2025,period:"2025~",status:"진행",
  summary:"이재명 정부의 민생 부양 카드 — 전국민·지역화폐 결합 소비쿠폰.",
  bg:"고물가·내수 부진 — 취임 직후 민생 지원 카드 필요.",
  content:"2025년 하반기 추경 편성 — 전 국민 지급 + 소상공인 지원 결합.",
  result:"집행 초기 — 소비 진작 효과와 재정 논란 병존(진행형).",
  src:"위키백과 '이재명 정부'"}
);
fs.writeFileSync("data/policies_new.json", JSON.stringify(pol, null, 2));
console.log("정책:", pol.policies.length);

// ============ 4) 공약 +5 ============
const pl = JSON.parse(fs.readFileSync("data/pledges.json", "utf8"));
const sample = {total:null,kept:0,broken:0,na:0,rate:null,rateLabel:null,url:""};
pl.pledges.push(
 {politician:"안철수",meta:"19대 대선(2017) · 국민의당",office:"president",
  real:{...sample,src:"자체 집계(보도 기반) — 2017 대선 후 패배로 정권 공약 이행 없음, 국민의당 해체·통합 과정에서 대부분 폐기"},
  items:[
   {title:"공정경제(재벌 개혁)",status:"broken",note:"야당 후보로 정권 교체 실패 — 공약 이행 주체 소멸."},
   {title:"기본소득 논의 확산",status:"progress",note:"안철수 이후 기본소득당(용혜인) 창당으로 부분 계승."}]},
 {politician:"홍준표",meta:"19대 대선(2017) · 자유한국당",office:"president",
  real:{...sample,src:"자체 집계(보도 기반) — 패배 후 대구시장 당선, 대선 공약은 지방 정책으로 부분 계승"},
  items:[
   {title:"감세·규제개혁",status:"progress",note:"이후 보수 정권(윤석열) 감세 정책으로 방향 계승."},
   {title:"대구 혁신도시 육성",status:"kept",note:"대구시장 재임 중 혁신도시 유치·확충."}]},
 {politician:"박원순",meta:"제7회 지방선거(2018) · 서울시장 3선",office:"local",
  real:{...sample,src:"자체 집계(보도 기반) — 2020.7 재임중 서거로 임기 중단"},
  items:[
   {title:"그린시티 서울(탈원전 도시)",status:"progress",note:"태양광 확충 등 진행 중 서거."},
   {title:"주거 대책(공공임대 확대)",status:"partial",note:"공급 목표 일부 달성 — 이후 시장(오세훈)의 정책 전환."}]},
 {politician:"김동연",meta:"제8회 지방선거(2022) · 경기지사",office:"local",
  real:{...sample,src:"자체 집계(보도 기반) — 임기 진행 중"},
  items:[
   {title:"경기 기본소득(청년)",status:"kept",note:"만 24세 경기 청년 기본소득(분기 25만 원) 시행 — 전국 첫 광역 단위."},
   {title:"경기도 혁신 산업 클러스터",status:"progress",note:"반도체·미래차 클러스터 조성 진행."}]},
 {politician:"최문순",meta:"제8회 지방선거(2022) · 강원지사 3선",office:"local",
  real:{...sample,src:"자체 집계(보도 기반) — 임기 진행 중"},
  items:[
   {title:"강원 세계겨울스포츠대회 유치",status:"kept",note:"2024 강원동계청소년올림픽 개최."},
   {title:"강원 관광 르네상스",status:"progress",note:"K-관광 도시 조성 사업 진행."}]}
);
fs.writeFileSync("data/pledges_new.json", JSON.stringify(pl, null, 2));
console.log("공약:", pl.pledges.length);
console.log("완료 — mv 실행 필요");
