"""SharePoint 읽기 (앱 전용).

★ Graph 와 SharePoint REST 를 **둘 다** 쓴다. 하나로 안 되기 때문이다:
    - 리스트 항목·문서 라이브러리 → Graph 가 깔끔하다
    - **리스트 항목의 첨부파일** → Graph 에 엔드포인트가 없다. SharePoint REST 뿐이다.
  둘은 audience 가 달라서 토큰도 각각 받는다.
"""
