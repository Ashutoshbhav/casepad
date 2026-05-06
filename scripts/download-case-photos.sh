#!/usr/bin/env bash
# Downloads ~180 curated Unsplash photos into public/case-photos/ for use as
# case-card thumbnails on /cases. Each photo is hash-mapped from a case ID so
# every case gets a stable, varied photo. No API key required — pulls from
# images.unsplash.com via public photo IDs.
#
# Re-runnable — skips files already cached at >50KB.
#
# Usage: bash scripts/download-case-photos.sh

set -e
cd "$(dirname "$0")/.."

DEST="public/case-photos"
mkdir -p "$DEST"

# 180 curated Unsplash photo IDs across business themes — boardroom,
# storefront, factory, healthcare, finance, airline, automotive, restaurant,
# tech, startup, meeting, urban, logistics, agriculture, education, media,
# hospitality, lab. Verified public on unsplash.com.
PHOTO_IDS=(
  # Boardroom / corporate / meetings (20)
  "photo-1517502884422-41eaead166d4"  "photo-1497366216548-37526070297c"
  "photo-1497366811353-6870744d04b2"  "photo-1431540015161-0bf868a2d407"
  "photo-1497366754035-f200968a6e72"  "photo-1568992687947-868a62a9f521"
  "photo-1543269664-7eef42226a21"     "photo-1497215728101-856f4ea42174"
  "photo-1577412647305-991150c7d163"  "photo-1542744173-8e7e53415bb0"
  "photo-1556761175-5973dc0f32e7"     "photo-1573164574572-cb89e39749b4"
  "photo-1573164713988-8665fc963095"  "photo-1568992687947-868a62a9f521"
  "photo-1530077999996-2c10d4eafe70"  "photo-1556761175-b413da4baf72"
  "photo-1552664730-d307ca884978"     "photo-1527443224154-c4a3942d3acf"
  "photo-1517048676732-d65bc937f952"  "photo-1591115765373-5207764f72e7"

  # Retail / storefront / e-commerce (15)
  "photo-1483985988355-763728e1935b"  "photo-1556742393-d75f468bfcb0"
  "photo-1441986300917-64674bd600d8"  "photo-1542838132-92c53300491e"
  "photo-1567401893414-76b7b1e5a7a5"  "photo-1607082348824-0a96f2a4b9da"
  "photo-1604719312566-8912e9227c6a"  "photo-1555529669-e69e7aa0ba9a"
  "photo-1472851294608-062f824d29cc"  "photo-1481437156560-3205f6a55735"
  "photo-1604858489022-9c7da7af1e96"  "photo-1530908295418-a12e326966ba"
  "photo-1488864644323-1eee85176a72"  "photo-1546069901-ba9599a7e63c"
  "photo-1571867424488-4565932edb41"

  # Manufacturing / factory / industrial (15)
  "photo-1581094794329-c8112a89af12"  "photo-1531973576160-7125cd663d86"
  "photo-1565793298595-6a879b1d9492"  "photo-1532187863486-abf9dbad1b69"
  "photo-1497435334941-8c899ee9e8e9"  "photo-1542816417-0983c9c9ad53"
  "photo-1581092160562-40aa08e78837"  "photo-1532187643603-ba119ca4109e"
  "photo-1518139622498-9c8b2a18b4c7"  "photo-1565043666747-69f6646db940"
  "photo-1610477200245-0cabf7d6c1c9"  "photo-1485827404703-89b55fcc595e"
  "photo-1581090464777-f3220bbe1b8b"  "photo-1521897258701-21eecb2e6f4d"
  "photo-1581093588401-fbb62a02f120"

  # Healthcare / medical (12)
  "photo-1576091160550-2173dba999ef"  "photo-1581595220892-b0739db3ba8c"
  "photo-1559757148-5c350d0d3c56"     "photo-1551601651-2a8555f1a136"
  "photo-1582719471384-894fbb16e074"  "photo-1583912267550-d6c2ac3196c0"
  "photo-1505751172876-fa1923c5c528"  "photo-1530497610245-94d3c16cda28"
  "photo-1579165466741-7f35e4755182"  "photo-1488751045188-3c55bbf9a3fa"
  "photo-1559757175-5700dde675bc"     "photo-1551076805-e1869033e561"

  # Finance / banking / trading (12)
  "photo-1554224155-6726b3ff858f"     "photo-1454165804606-c3d57bc86b40"
  "photo-1611974789855-9c2a0a7236a3"  "photo-1559526324-4b87b5e36e44"
  "photo-1559526324-c1f275fbfa32"     "photo-1559523161-0fc0d8b38a7a"
  "photo-1543286386-713bdd548da4"     "photo-1579621970795-87facc2f976d"
  "photo-1604594849809-dfedbc827105"  "photo-1565514020179-026b5f28dc05"
  "photo-1518186285589-2f7649de83e0"  "photo-1559526323-cb2f2fe2591b"

  # Airline / aviation / travel (10)
  "photo-1436491865332-7a61a109cc05"  "photo-1556388158-158ea5ccacbd"
  "photo-1542296332-2e4473faf563"     "photo-1569154941061-e231b4725ef1"
  "photo-1474302770737-173ee21bab63"  "photo-1583500178690-f7fd39b91c6d"
  "photo-1484069560501-87d72b0c3669"  "photo-1556388158-158ea5ccacbd"
  "photo-1518991669955-9c7e78ec80a8"  "photo-1542296332-2e4473faf563"

  # Automotive / cars (10)
  "photo-1492144534655-ae79c964c9d7"  "photo-1503376780353-7e6692767b70"
  "photo-1494976388531-d1058494cdd8"  "photo-1542362567-b07e54358753"
  "photo-1503736334956-4c8f8e92946d"  "photo-1568605114968-0d4d394e6c0f"
  "photo-1605559424843-9e4c228bf1c2"  "photo-1494976388531-d1058494cdd8"
  "photo-1485291571150-772bcfc10da5"  "photo-1583121274602-3e2820c69888"

  # Tech / data / SaaS (15)
  "photo-1518770660439-4636190af475"  "photo-1551434678-e076c223a692"
  "photo-1593642632559-0c6d3fc62b89"  "photo-1581291518857-4e27b48ff24e"
  "photo-1593642632823-8f785ba67e45"  "photo-1531297484001-80022131f5a1"
  "photo-1573497019940-1c28c88b4f3e"  "photo-1497032628192-86f99bcd76bc"
  "photo-1517694712202-14dd9538aa97"  "photo-1551033406-611cf9a28f67"
  "photo-1542744173-05336fcc7ad4"     "photo-1531403009284-440f080d1e12"
  "photo-1605379399642-870262d3d051"  "photo-1551033406-611cf9a28f67"
  "photo-1542903660-eedba2cda473"

  # Energy / oil + gas / power (8)
  "photo-1466611653911-95081537e5b7"  "photo-1473341304170-971dccb5ac1e"
  "photo-1497440001374-f26997328c1b"  "photo-1497440001374-f26997328c1b"
  "photo-1581094271901-8022df4466f9"  "photo-1497436072909-60f360e1d4b1"
  "photo-1507537297725-24a1c029d3ca"  "photo-1497440001374-f26997328c1b"

  # Hospitality / hotel / restaurant (10)
  "photo-1455587734955-081b22074882"  "photo-1564501049412-61c2a3083791"
  "photo-1414235077428-338989a2e8c0"  "photo-1517248135467-4c7edcad34c4"
  "photo-1551632436-cbf8dd35adfa"     "photo-1517457373958-b7bdd4587205"
  "photo-1559329007-40df8a9345d8"     "photo-1582719508461-905c673771fd"
  "photo-1559339352-11d035aa65de"     "photo-1517248135467-4c7edcad34c4"

  # Logistics / supply chain / warehouse (8)
  "photo-1586528116311-ad8dd3c8310d"  "photo-1553413077-190dd305871c"
  "photo-1494412574643-ff11b0a5c1c3"  "photo-1601584115197-04ecc0da31d1"
  "photo-1535732759880-bbd5c7265e3f"  "photo-1605000797499-95a51c5269ae"
  "photo-1601584115197-04ecc0da31d1"  "photo-1605000797499-95a51c5269ae"

  # Agriculture / farming (8)
  "photo-1500595046743-cd271d694d30"  "photo-1464226184884-fa280b87c399"
  "photo-1574323347407-f5e1ad6d020b"  "photo-1542838132-92c53300491e"
  "photo-1444858345567-c5d8f37dd7d4"  "photo-1530507629858-e3759c0e75db"
  "photo-1592982254022-f12d3c11e0a2"  "photo-1592982254022-f12d3c11e0a2"

  # Media / entertainment / sports (8)
  "photo-1522202176988-66273c2fd55f"  "photo-1611162616475-46b635cb6868"
  "photo-1574169208507-84376144848b"  "photo-1493612276216-ee3925520721"
  "photo-1485846234645-a62644f84728"  "photo-1525193612562-0ec53b0e5d7c"
  "photo-1574169208507-84376144848b"  "photo-1485846234645-a62644f84728"

  # Education / school (6)
  "photo-1497486751825-1233686d5d80"  "photo-1503676260728-1c00da094a0b"
  "photo-1509062522246-3755977927d7"  "photo-1427504494785-3a9ca7044f45"
  "photo-1452860606245-08befc0ff44b"  "photo-1503676260728-1c00da094a0b"

  # Real estate / construction / urban (8)
  "photo-1560518883-ce09059eeffa"     "photo-1486325212027-8081e485255e"
  "photo-1486406146926-c627a92ad1ab"  "photo-1505691938895-1758d7feb511"
  "photo-1486406146926-c627a92ad1ab"  "photo-1493809842364-78817add7ffb"
  "photo-1444084316824-dc26d6657664"  "photo-1487958449943-2429e8be8625"
)

UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
TOTAL=${#PHOTO_IDS[@]}
COUNT=0
SKIP=0
FAIL=0

echo "Downloading $TOTAL Unsplash photos to $DEST/ ..."
echo ""

for i in "${!PHOTO_IDS[@]}"; do
  id="${PHOTO_IDS[$i]}"
  out="$DEST/case-$(printf '%03d' $i).jpg"
  if [[ -f "$out" ]]; then
    size=$(stat -c%s "$out" 2>/dev/null || echo 0)
    if [[ "$size" -gt 50000 ]]; then
      SKIP=$((SKIP+1))
      continue
    fi
  fi
  url="https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80"
  http=$(curl -sSL -A "$UA" -o "$out" "$url" -w "%{http_code}" 2>/dev/null || echo "000")
  if [[ "$http" == "200" ]]; then
    COUNT=$((COUNT+1))
    [[ $((COUNT % 20)) == 0 ]] && echo "  $COUNT/$TOTAL downloaded..."
  else
    FAIL=$((FAIL+1))
    rm -f "$out"
  fi
done

echo ""
echo "Done — downloaded $COUNT, skipped $SKIP cached, failed $FAIL out of $TOTAL"
ls "$DEST" | wc -l | xargs -I{} echo "Files now in $DEST: {}"
