import os
from openai import OpenAI
from dotenv import load_dotenv
import json

load_dotenv()

class AIProcessor:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        # 페르소나 파일 로드
        try:
            with open('apps/ai-worker/PERSONA.md', 'r', encoding='utf-8') as f:
                self.persona = f.read()
        except:
            self.persona = "Geniein is a Digital Transformation and AI company."

    def process_news(self, title, content, feed_category="IT"):
        print(f"🤖 AI Strategic Analysis [{feed_category}]: {title[:30]}...")
        
        prompt = f"""
        당신은 아래 페르소나를 가진 지니인(Geniein)의 전략 컨설턴트입니다. 
        제공된 페르소나 가이드라인에 맞춰 뉴스를 분석해주세요.
        
        참고: 이 뉴스는 '{feed_category}' 관련 피드에서 수집되었습니다.

        [GENIEIN PERSONA]
        {self.persona}

        [뉴스 정보]
        제목: {title}
        내용: {content}

        [요구사항]
        - 지니인 사업(특히 GNOM)과의 관련도를 0~100점으로 평가하세요.
        - 'perspective_kr' 항목에는 이 뉴스가 지니인의 사업 방향과 어떻게 직결되는지 전문적인 관점을 추가하세요.
        - 결과는 반드시 아래 JSON 형식으로만 답변하세요.
        - 카테고리('category') 분류 기준:
          * 'oda': 정부 예산이 투입되거나 공공 기관(KOICA, EDCF, UN, World Bank, 정부 부처 등)이 직접 참여하는 공적 개발 원조/협력 사업인 경우.
          * 'it': 민간 기업의 투자(FDI), 순수 기술 트렌드, 일반적인 비즈니스 확장인 경우. (예: SK/삼성의 투자는 'it', KOICA의 지원 사업은 'oda')

        {{
            "title_kr": "전문적이고 전략적인 국문 제목",
            "summary_kr": "7-10문장 분량의 딥다이브 요약 (기사의 핵심 맥락, 주요 데이터, 시사점을 상세히 포함)",
            "perspective_kr": "지니인만의 차별화된 비즈니스 관점 분석 (전문적이고 통찰력 있게)",
            "category": "oda 또는 it",
            "tags": ["카테고리에 특화된 태그 3-4개 (예: ODA는 '글로벌진출', '국제협력', '시장동향' / IT는 'AI', '기술혁신', 'DX')", "태그2"],
            "relevance_score": 점수(숫자)
        }}
        """

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "당신은 유능한 기술/정책 전문 에디터입니다."},
                    {"role": "user", "content": prompt}
                ],
                response_format={ "type": "json_object" }
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # 데이터 타입 검증 (리스트여야 할 tags가 혹시 dict로 올 경우 대비)
            if 'tags' in result and not isinstance(result['tags'], list):
                result['tags'] = [str(result['tags'])]
                
            return result
        except Exception as e:
            print(f"❌ AI Processing Error Details: {e}")
            import traceback
            traceback.print_exc()
            return None

    def generate_image(self, title, category="it"):
        print(f"🎨 Generating {category.upper()} Realistic Image for: {title[:30]}...")
        try:
            # 현실적인 비주얼 전략 (Cinematic Realism)
            if category.lower() == "oda":
                visual_concept = "Modern urban architecture, a strategic global logistics hub, or a large-scale sustainable energy infrastructure. Realistic world-class development scenes."
                style_hint = "Architectural photography, wide-angle lens, cinematic natural lighting, realistic textures of glass and steel."
            else:
                visual_concept = "A clean, high-tech data center interior, a macro shot of advanced semiconductor hardware, or smart city digital infrastructure in a real urban setting."
                style_hint = "Industrial macro photography, shallow depth of field, realistic metallic and glass reflections, precise technical detail."

            abstract_prompt = f"""
            A professional, high-end cinematic photograph representing the theme: '{title}'. 
            Subject: {visual_concept}
            Style: {style_hint}
            Atmosphere: Sophisticated, state-of-the-art, and clean. 
            NO robots, NO humanoids, NO faces, NO text, NO cheesy stock photo elements. 
            Focus on the beauty of modern engineering, architecture, and technology.
            High-quality, 4k resolution, hyper-realistic textures.
            """
            
            response = self.client.images.generate(
                model="dall-e-3",
                prompt=abstract_prompt.strip(),
                size="1024x1024",
                quality="standard",
                n=1,
            )
            
            image_url = response.data[0].url
            return image_url
        except Exception as e:
            print(f"❌ Image Generation Error: {e}")
            return None
