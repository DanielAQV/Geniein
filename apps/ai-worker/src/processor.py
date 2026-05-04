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
        - 지니인 사업과의 관련도를 0~100점으로 평가하세요.
        - 모든 문장은 신뢰감 있는 전문 뉴스/보고서체(~다, ~이다)로 통일하세요.
        - 결과는 반드시 아래 JSON 형식으로만 답변하세요.
        - 카테고리('category') 분류 기준:
          * 'oda': 정부 예산이 투입되거나 공공 기관(KOICA, EDCF, UN, World Bank, 정부 부처 등)이 직접 참여하는 공적 개발 원조/협력 사업인 경우.
          * 'it': 민간 기업의 투자(FDI), 순수 기술 트렌드, 일반적인 비즈니스 확장인 경우. (예: SK/삼성의 투자는 'it', KOICA의 지원 사업은 'oda')

        {{
            "title_kr": "전문적이고 전략적인 국문 제목",
            "summary_kr": "7-10문장 분량의 딥다이브 요약 (기사의 핵심 맥락, 주요 데이터, 시사점 포함). 가독성을 위해 2-3개의 문단으로 나누어 작성하고, 문단 사이에는 줄바꿈(빈 줄)을 반드시 포함하세요.",
            "category": "oda 또는 it",
            "tags": ["카테고리에 특화된 태그 3-4개"],
            "relevance_score": 점수(숫자)
        }}
        """

        try:
            response = self.client.chat.completions.create(
                model="gpt-5.4-nano",
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
        print(f"🎨 Generating {category.upper()} Realistic Image (FLUX.1) for: {title[:30]}...")
        
        together_api_key = os.getenv('TOGETHER_API_KEY')
        if not together_api_key:
            print("⚠️ TOGETHER_API_KEY not found in .env. Falling back to DALL-E 3 or skipping.")
            # Fallback logic or just return None
            # Here we'll try to use Together AI via a new client instance
        
        try:
            # 1. GPT를 사용하여 뉴스 제목에 최적화된 사실적인 사진 프롬프트 생성
            prompt_gen_msg = f"""
            Create a highly realistic, professional photography prompt for an AI image generator based on this news title: '{title}'
            Category: {category}

            [Rules]
            1. Style: Realistic documentary photography, natural business environment, or authentic industrial detail.
            2. Realism: Must look like a natural, unedited photo (Natural lighting, no dramatic filters, realistic everyday textures). 
            3. Subject: Focus strictly on the core keywords and themes of the news title.
               - Create a scene that feels like a real-life observation, not a staged or epic cinematic shot.
               - Avoid overreliance on common electronics like laptops or computer monitors as the primary subject. 
               - Instead, find more creative and diverse visual metaphors: a clean architectural corner, specialized industrial equipment, a sophisticated data visualization on a wall (no text), or a high-quality close-up of a relevant material or object.
               - Aim for an authentic, grounded, and practical visual representation.
            4. No-Go: ABSOLUTELY NO PEOPLE, NO HUMANS, NO HANDS, NO FACES.
               - The scene must be a still-life, an empty environment, or a close-up of objects. 
               - ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO SYMBOLS, NO LOGOS. 
               - NO robots, NO humanoids, NO cheesy 3D renders.
            5. Atmosphere: Authentic, clean, and grounded. 
            
            IMPORTANT: Do not use laptops or desktops as a 'default' for tech news. Explore more diverse and sophisticated imagery.
            IMPORTANT: Do not include any human figures or parts of people. Focus on objects and professional environments.
            IMPORTANT: Avoid dramatic, epic, or cinematic 'movie-like' visuals. Keep it realistic and natural.
            IMPORTANT: The image must be completely free of any text or alphabet characters.
            Output ONLY the final English prompt.
            """

            prompt_response = self.client.chat.completions.create(
                model="gpt-5.4-nano",
                messages=[
                    {"role": "system", "content": "You are a professional commercial photographer and prompt engineer."},
                    {"role": "user", "content": prompt_gen_msg}
                ]
            )
            
            optimized_prompt = prompt_response.choices[0].message.content.strip()
            print(f"📝 Optimized Prompt: {optimized_prompt[:100]}...")

            # 2. Together AI (FLUX.1 [schnell])를 사용하여 이미지 생성
            # Together AI는 OpenAI SDK와 호환되므로 base_url만 바꿔서 사용 가능합니다.
            together_client = OpenAI(
                api_key=together_api_key,
                base_url="https://api.together.xyz/v1",
            )

            response = together_client.images.generate(
                model="black-forest-labs/FLUX.1-schnell",
                prompt=optimized_prompt,
                size="1024x1024",
                n=1,
            )
            
            image_url = response.data[0].url
            return image_url
        except Exception as e:
            print(f"❌ Image Generation Error: {e}")
            return None
