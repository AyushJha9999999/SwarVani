"""Normalize extracted values while preserving the original spoken transcript."""
import re
import unicodedata

ENGLISH = dict(zip(
    'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(), range(20)))
ENGLISH.update(dict(zip('twenty thirty forty fifty sixty seventy eighty ninety'.split(), range(20, 100, 10))))
ENGLISH['oh'] = 0
HINDI = dict(zip(
    'शून्य एक दो तीन चार पांच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस बीस इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस तीस इकतीस बत्तीस तैंतीस चौंतीस पैंतीस छत्तीस सैंतीस अड़तीस उनतालीस चालीस इकतालीस बयालीस तैंतालीस चवालीस पैंतालीस छियालीस सैंतालीस अड़तालीस उनचास पचास इक्यावन बावन तिरपन चौवन पचपन छप्पन सत्तावन अट्ठावन उनसठ साठ इकसठ बासठ तिरसठ चौंसठ पैंसठ छियासठ सड़सठ अड़सठ उनहत्तर सत्तर इकहत्तर बहत्तर तिहत्तर चौहत्तर पचहत्तर छिहत्तर सतहत्तर अठहत्तर उनासी अस्सी इक्यासी बयासी तिरासी चौरासी पचासी छियासी सतासी अट्ठासी नवासी नब्बे इक्यानवे बानवे तिरानवे चौरानवे पंचानवे छियानवे सत्तानवे अट्ठानवे निन्यानवे'.split(), range(100)))
HINDI.update({'पाँच': 5, 'छः': 6, 'पन्द्रह': 15})
NUMBERS = ENGLISH | HINDI | dict(zip('ek do teen char paanch chhe saat aath nau das'.split(), range(1, 11))) | {'pachaas': 50, 'pachas': 50}
NUMBERS.update(dict(zip('जीरो वन टू थ्री फोर फाइव सिक्स सेवन एट नाइन'.split(), range(10))))
SCALES = {'hundred': 100, 'thousand': 1000, 'सौ': 100, 'हजार': 1000, 'हज़ार': 1000}
TOKEN = '(?:' + '|'.join(sorted(map(re.escape, NUMBERS | SCALES), key=len, reverse=True)) + r'|\d+)'
NUMBER_PHRASE = re.compile(rf'(?<!\w){TOKEN}(?:[ -]+(?:(?:and|और)[ -]+)?{TOKEN})*(?:\s+(?:point|decimal|दशमलव)\s+{TOKEN}(?:[ -]+{TOKEN})*)?(?!\w)', re.I)


def number_value(phrase: str) -> str:
    if phrase.isdigit():
        return phrase
    parts = re.split(r'\s+(?:point|decimal|दशमलव)\s+', phrase.lower())
    words = [w for w in re.split(r'[ -]+', parts[0]) if w not in {'and', 'और'}]
    values = [int(w) if w.isdigit() else NUMBERS.get(w) for w in words]
    if all(v is not None and v < 10 for v in values):
        result = ''.join(str(v) for v in values)
    elif len(values) == 2 and values[0] is not None and values[1] is not None and 0 < values[0] < 10 and values[1] >= 20:
        result = str(values[0] * 100 + values[1])  # BP: one twenty
    elif len(values) == 3 and all(v is not None for v in values) and 0 < values[0] < 10 and values[1] >= 20 and values[2] < 10:
        result = str(values[0] * 100 + values[1] + values[2])
    else:
        total = current = 0
        for word, value in zip(words, values):
            if word in SCALES:
                scale = SCALES[word]
                current = (current or 1) * scale
                if scale >= 1000:
                    total += current
                    current = 0
            else:
                current += value or 0
        result = str(total + current)
    if len(parts) > 1:
        decimals = [str(NUMBERS.get(w, w)) for w in re.split(r'[ -]+', parts[1])]
        result += '.' + ''.join(decimals)
    return result


def normalize_numbers(text: str) -> str:
    text = ''.join(str(unicodedata.digit(c)) if c.isdecimal() else c for c in text)
    # Numeric dates and decimal values are already normalized, so keep them
    # outside the spoken-number parser (including leading-zero IDs).
    pieces = re.split(r'(\d{4}-\d{2}-\d{2}|\d+\.\d+)', text)
    return ''.join(piece if i % 2 else NUMBER_PHRASE.sub(lambda m: number_value(m.group()), piece)
                   for i, piece in enumerate(pieces))


def latin_name(name: str) -> str:
    """Readable Latin transliteration; spelling can still be corrected by the user."""
    known = {'अम्मार': 'Ammar', 'सुनीता': 'Sunita', 'सीता': 'Sita', 'गीता': 'Gita', 'देवी': 'Devi', 'कुमार': 'Kumar', 'राहुल': 'Rahul', 'आयुष': 'Ayush', 'झा': 'Jha', 'शर्मा': 'Sharma'}
    consonants = dict(zip('क ख ग घ ङ च छ ज झ ञ ट ठ ड ढ ण त थ द ध न प फ ब भ म य र ल व श ष स ह'.split(), 'k kh g gh n ch chh j jh n t th d dh n t th d dh n p ph b bh m y r l v sh sh s h'.split()))
    vowels = dict(zip('अ आ इ ई उ ऊ ऋ ए ऐ ओ औ'.split(), 'a a i ee u oo ri e ai o au'.split()))
    matras = dict(zip('ा ि ी ु ू ृ े ै ो ौ'.split(), 'a i i u oo ri e ai o au'.split()))

    def word(match):
        source = match.group()
        if source in known:
            return known[source]
        out = ''
        for i, ch in enumerate(source):
            nxt = source[i + 1] if i + 1 < len(source) else ''
            if ch in consonants:
                out += consonants[ch]
                if nxt and nxt not in matras and nxt not in {'्', '़'}:
                    out += 'a'
            elif ch in vowels:
                out += vowels[ch]
            elif ch in matras:
                out += matras[ch]
            elif ch in 'ंँ':
                out += 'n'
            elif ch == '़':
                pass
        return out.title()
    return re.sub(r'[\u0900-\u097F]+', word, name).strip().title()
