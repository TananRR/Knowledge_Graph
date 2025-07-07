import requests
import hashlib
import random
import json


class BaiduTranslator:
    def __init__(self, appid, secret_key):
        self.appid = appid
        self.secret_key = secret_key
        self.url = 'https://fanyi-api.baidu.com/api/trans/vip/translate'

    def translate(self, text, from_lang='en', to_lang='zh'):
        salt = str(random.randint(32768, 65536))
        sign = hashlib.md5((self.appid + text + salt + self.secret_key).encode()).hexdigest()

        params = {
            'q': text,
            'from': from_lang,
            'to': to_lang,
            'appid': self.appid,
            'salt': salt,
            'sign': sign
        }

        try:
            response = requests.get(self.url, params=params)
            result = response.json()
            if 'trans_result' in result:
                return result['trans_result'][0]['dst']
            return text  # 翻译失败返回原文
        except Exception as e:
            print(f"翻译出错: {e}")
            return text


def translate_relations_with_api(data, translator):
    """
    使用翻译API处理关系类型
    :param data: 原始数据
    :param translator: 翻译器实例
    :return: 翻译后的数据
    """
    # 深拷贝原始数据
    translated_data = json.loads(json.dumps(data))

    # 缓存已翻译的结果避免重复请求
    translation_cache = {}

    for relation in translated_data["relations"]:
        # 翻译type字段
        if relation["type"] not in translation_cache:
            translation_cache[relation["type"]] = translator.translate(relation["type"])
        relation["type"] = translation_cache[relation["type"]]

        # 翻译verb字段（如果与type不同）
        if relation["verb"] != relation["type"]:
            if relation["verb"] not in translation_cache:
                translation_cache[relation["verb"]] = translator.translate(relation["verb"])
            relation["verb"] = translation_cache[relation["verb"]]
        else:
            relation["verb"] = relation["type"]

    return translated_data
