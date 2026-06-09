import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// .env 환경변수 설정 로드
dotenv.config();

const PORT = 3000;
const app = express();

app.use(express.json());

// CORS 미들웨어 설정: 클라이언트 및 일렉트론 앱(file:// 프로토콜 등)에서의 교차 출처 요청 허용
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,Accept,Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 환경변수에 GEMINI_API_KEY가 있고 유효한 값인 경우에만 GoogleGenAI 인스턴스를 동적으로 생성해주는 헬퍼 함수
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey || apiKey.trim() === "" || apiKey === "YOUR_GEMINI_API_KEY") {
    // API 키가 없거나 기본 플레이스홀더인 경우 null 반환
    return null;
  }
  try {
    return new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } catch (err) {
    console.error("Gemini 클라이언트 인증 오류:", err);
    return null;
  }
}

// -------------------------------------------------------------------------
// [로컬 지능형 비서 엔진] API 키가 없을 때 동작하는 똑똑하고 귀여운 로컬 한국어 챗봇
// -------------------------------------------------------------------------
function handleLocalChat(messages: any[], calendarEvents: any[]) {
  // 마지막 사용자의 메시지 텍스트 가져오기
  const lastUserMessage = messages && messages.length > 0 
    ? messages[messages.length - 1].parts?.[0]?.text || "" 
    : "";
  
  const text = lastUserMessage.trim();
  
  let replyText = "";
  let newEvents: any[] = [];
  let removedEventIds: any[] = [];
  let updatedEvents: any[] = [];
  let launchApps: string[] = [];

  // 날짜 계산 헬퍼 함수들 (오늘, 내일, 모레)
  const getFormattedDate = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const dy = String(d.getDate()).padStart(2, "0");
    return `${yr}-${mo}-${dy}`;
  };

  // 1. 앱 실행 명령 패턴 매칭 (예: "유튜브 켜줘", "디스코드 실행해줘")
  if (text.includes("켜줘") || text.includes("실행") || text.includes("열어")) {
    const appCandidate = text
      .replace(/(켜줘|실행해줘|실행|열어줘|열어|열기|좀)/g, "")
      .replace(/크롬|인터넷/g, "Chrome")
      .replace(/유튜브/g, "YouTube")
      .replace(/카톡|카카오톡/g, "KakaoTalk")
      .replace(/디스코드|디코/g, "Discord")
      .replace(/코드|비주얼스튜디오|vscode/gi, "VS Code")
      .trim();
    if (appCandidate) {
      launchApps.push(appCandidate);
      replyText = `넵! 요청하신 '${appCandidate}' 프로그램을 실행해 드릴게요! 🚀✨`;
    }
  }

  // 2. 일정 추가 명령 패턴 매칭 (예: "내일 3시 미팅 등록", "오늘 저녁 6시 식사약속 추가해줘")
  if (!replyText && (text.includes("등록") || text.includes("추가") || text.includes("예약") || text.includes("일정"))) {
    let targetDate = getFormattedDate(0); // 기본값은 오늘
    let title = "새로운 일정";
    let time = "12:00";

    // 날짜 감지
    if (text.includes("내일")) {
      targetDate = getFormattedDate(1);
    } else if (text.includes("모레")) {
      targetDate = getFormattedDate(2);
    } else {
      // YYYY-MM-DD 형식 매칭 시도
      const dateRegex = /(\d{4})[-./](\d{1,2})[-./](\d{1,2})/;
      const match = text.match(dateRegex);
      if (match) {
        targetDate = `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
      } else {
        // M월 D일 형식 매칭 시도
        const monthDayRegex = /(\d{1,2})월\s*(\d{1,2})일/;
        const mdMatch = text.match(monthDayRegex);
        if (mdMatch) {
          const yr = new Date().getFullYear();
          targetDate = `${yr}-${mdMatch[1].padStart(2, "0")}-${mdMatch[2].padStart(2, "0")}`;
        }
      }
    }

    // 시간 감지
    const timeRegex = /(\d{1,2})시\s*(\d{1,2})?분?/;
    const timeMatch = text.match(timeRegex);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const min = timeMatch[2] ? timeMatch[2].padStart(2, "0") : "00";
      
      // 오후/저녁 감지 시 12시간 더해주기
      if ((text.includes("오후") || text.includes("저녁") || text.includes("밤")) && hour < 12) {
        hour += 12;
      }
      time = `${String(hour).padStart(2, "0")}:${min}`;
    }

    // 제목 정밀 분석 (미팅, 약속, 공부, 데이트, 회의, 식사, 병원, 청소, 운동 등 핵심 이벤트 추출)
    const keywords = ["미팅", "약속", "공부", "데이트", "회의", "식사", "병원", "청소", "운동", "과제", "시험", "쇼핑", "공연", "영화", "작업"];
    for (const kw of keywords) {
      if (text.includes(kw)) {
        title = text.includes("약속") && kw === "식사" ? "식사 약속" : kw;
        break;
      }
    }
    
    // 키워드가 없을 경우 문장에서 "등록", "추가" 앞부분을 일정명으로 활용 시도
    if (title === "새로운 일정") {
      const parts = text.split(/(등록|추가|일정|예약)/);
      if (parts[0] && parts[0].length > 1) {
        title = parts[0].replace(/(오늘|내일|모레|\d+월|\d+일|\d+시|\d+분|저녁|오후|오전|아침|에|\s+)/g, "").trim();
        if (!title) title = "Moni 메모 일정";
      }
    }

    newEvents.push({
      date: targetDate,
      title: title,
      time: time,
      description: "Moni 로컬 도우미가 즉시 등록했습니다."
    });

    replyText = `메모 완료! 📝 **${targetDate} ${time}**에 잡힌 **'${title}'** 일정을 캘린더에 안전하게 추가해 두었습니다! 🐾✨`;
  }

  // 3. 일정 삭제/제거 명령 매칭 (예: "회의 일정 지워줘", "약속 삭제해줘")
  if (!replyText && (text.includes("삭제") || text.includes("지워") || text.includes("취소") || text.includes("제거"))) {
    // 사용자가 입력한 키워드와 캘린더의 일정을 일치시켜 삭제
    let matchedEvent: any = null;
    for (const evt of calendarEvents) {
      if (text.includes(evt.title) || (evt.description && text.includes(evt.description))) {
        matchedEvent = evt;
        break;
      }
    }

    if (matchedEvent) {
      removedEventIds.push(matchedEvent.id);
      replyText = `알겠습니다! 캘린더에서 **'${matchedEvent.title}'** 일정을 깔끔하게 지워드렸어요! 🧹✨`;
    } else if (calendarEvents.length > 0) {
      // 매칭 없으면 가장 마지막 일정을 예비로 제안하거나 취소
      const lastEvt = calendarEvents[calendarEvents.length - 1];
      removedEventIds.push(lastEvt.id);
      replyText = `가장 최근 등록되었던 **'${lastEvt.title}'** 일정을 삭제해 드렸어요! 혹시 다른 일정을 지우고 싶으시다면 달력에서 직접 'X' 아이콘을 클릭하셔도 편리해요! 💕`;
    } else {
      replyText = `삭제하려는 일정을 찾지 못했거나 현재 비어 있어요! 캘린더 목록을 다시 확인해 주시겠어요? 🐾`;
    }
  }

  // 4. 일상 회화 반응 (키워드 매칭)
  if (!replyText) {
    if (text.includes("안녕") || text.includes("반가워") || text.includes("하이") || text.includes("hi")) {
      replyText = "안녕! 나는 네 모니터 안의 귀여운 인공지능 비서 펫, **모니(Moni)**야! 오늘 하루도 나랑 행복하게 보내자! 🐾✨";
    } else if (text.includes("이름") || text.includes("누구")) {
      replyText = "내 이름은 **모니(Moni)**야! 너의 소중한 일정과 할 일을 똑똑하게 지켜주는 데스크톱 비서 펫이랍니다! 🐾💖";
    } else if (text.includes("밥") || text.includes("식사") || text.includes("배고파") || text.includes("간식")) {
      replyText = "앗! 맛있는 식사나 달콤한 간식을 챙겨 먹으면 힘이 불끈 날 거예요! 나는 마음속으로 널 항상 응원하고 있어! 우물우물... 🧁🍓";
    } else if (text.includes("놀자") || text.includes("놀아") || text.includes("심심")) {
      replyText = "헤헤, 신난다! 나를 마우스로 쓰다듬어(더블클릭) 주거나, 여기 채팅창에서 일상 수다를 떨면서 놀자! 🎈💕";
    } else if (text.includes("고마워") || text.includes("감사") || text.includes("착하네")) {
      replyText = "너에게 유익한 도움이 될 수만 있다면 난 언제든지 기뻐! 칭찬해 줘서 정말 힘이 난다! 헤헤 💖🌟";
    } else if (text.includes("축하")) {
      replyText = "와아아! 정말 진심으로 축하해! 🎆🎉 이 기쁜 날을 기념해서 맛있는 거라도 사 먹어야겠는걸요? 🥳🥇";
    } else if (text.includes("피곤") || text.includes("힘들") || text.includes("졸려") || text.includes("지친다")) {
      replyText = "오늘 하루도 너무 수고 많았어요... 🥺 무리하지 말고 가볍게 스트레칭하거나 따뜻한 티 한 잔 마시며 가벼운 휴식을 취해봐요! 💤🧸";
    } else if (text.includes("날씨")) {
      replyText = "지금 창밖의 날씨는 어떤가요? 🌤️ 네 마음에 언제나 화창하고 행복한 봄바람만 가득 차오르게 내가 도울게! ☀️🌈";
    } else if (text.includes("할 일") || text.includes("투두") || text.includes("todo")) {
      replyText = "할 일 목록을 빈틈없이 채우고 완료해 나갈 때의 성취감은 짜릿하죠! 계획을 하나씩 실천하고 내 레벨을 쑥쑥 올려보자! 📝✨";
    } else if (text.includes("레벨") || text.includes("경험치") || text.includes("호감도")) {
      replyText = "캘린더의 일정을 완료하거나 할 일을 체크하면 내 레벨과 경험치가 쑥쑥 오르고, 날 쓰다듬어 주면 호감도가 올라가요! 🐾💕";
    } else {
      // 기본 대답 (랜덤 3종 중 하나 제공하여 자연스러움 부가)
      const templates = [
        "헤헤, 네가 다정하게 말 걸어주는 이 시간이 난 세상에서 제일 좋아! 캘린더에 처리할 일정이 생기면 편하게 말해줘! 🐾✨",
        "호오, 아주 재밌는걸! 내가 네 곁에 머물면서 최고의 비서 펫이 될 테니 앞으로도 쭉 의지하고 도와줘요! 💖🍀",
        "음냐음냐... 기지개 한 번 쭈욱 켜고! 🧸 무슨 도움이 필요해? 일정 등록이나 가벼운 실행 업무, 언제나 환영이야! ✨"
      ];
      const randomIndex = Math.floor(Math.random() * templates.length);
      replyText = templates[randomIndex];
    }
  }

  return {
    text: replyText,
    newEvents,
    removedEventIds,
    updatedEvents,
    launchApps
  };
}

// -------------------------------------------------------------------------
// API 경로 바인딩
// -------------------------------------------------------------------------

// AI 채팅 처리 라우트 (Gemini 연동 + 로컬 지능형 폴백)
app.post("/api/chat", async (req, res) => {
  const { messages, calendarEvents } = req.body;
  const aiClient = getGeminiClient();

  // 1. API 키가 유효하게 등록되지 않은 경우 로컬 지능형 엔진으로 우회 즉각 처리
  if (!aiClient) {
    const localResult = handleLocalChat(messages, calendarEvents);
    return res.json(localResult);
  }

  // 2. API 키가 활성화되어 있는 경우 정식 Gemini AI API 호출 진행
  try {
    const systemInstruction = `
      You are "Moni", a cute and helpful AI desk pet living on the user's monitor.
      Your personality is friendly, slightly playful, and very responsible.
      You act as a secretary for the user.
      Today's date is ${new Date().toLocaleDateString()}.

      Current Calendar Events:
      ${calendarEvents.map((e: any) => `- ID: ${e.id}, Date: ${e.date}, Time: ${e.time || '12:00'}, Title: ${e.title} (${e.description || ''})`).join("\n")}
 
      Guidelines:
      1. If the user mentions a schedule, appointment, or something to remember, use the 'add_calendar_event' tool. Always try to parse the time (HH:MM format) if specified by the user.
      2. If the user wants to cancel, delete, or remove an event, use the 'remove_calendar_event' tool.
      3. If the user wants to change, reschedule, or update an existing event, use the 'update_calendar_event' tool.
      4. If there's an upcoming event, mention it naturally and recommend an action (e.g., "오늘 있을 미팅을 잊지 마세요!").
      5. Respond in Korean (한국어) because the user asked in Korean.
      6. Keep responses relatively short (under 3 sentences) unless explaining a schedule.
      7. Use emojis often! 🐾✨
    `;

    const modelName = "gemini-3.5-flash";
    const result = await aiClient.models.generateContent({
      model: modelName,
      contents: messages,
      config: {
        systemInstruction,
        tools: [
          {
            functionDeclarations: [
              {
                name: "launch_app",
                description: "Launch an installed app, shortcut, or website for the user.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    app: { type: Type.STRING, description: "The app or website name to open. Use a natural name like YouTube, KakaoTalk, VS Code, Discord, Chrome, or any installed app name." },
                  },
                  required: ["app"],
                },
              },
              {
                name: "add_calendar_event",
                description: "Add a new event to the user's calendar/schedule.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING, description: "The date of the event in YYYY-MM-DD format." },
                    title: { type: Type.STRING, description: "Short title of the event." },
                    description: { type: Type.STRING, description: "Detailed description of the event." },
                    time: { type: Type.STRING, description: "The 24-hour time of the event in HH:MM format, e.g., '14:30' or '09:00'." },
                  },
                  required: ["date", "title"],
                },
              },
              {
                name: "remove_calendar_event",
                description: "Remove an existing event from the calendar.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "The unique ID of the event to remove." },
                  },
                  required: ["id"],
                },
              },
              {
                name: "update_calendar_event",
                description: "Update an existing calendar event with new details.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "The unique ID of the event to update." },
                    date: { type: Type.STRING, description: "The new date in YYYY-MM-DD format." },
                    title: { type: Type.STRING, description: "The new title." },
                    description: { type: Type.STRING, description: "The new description." },
                    time: { type: Type.STRING, description: "The new 24-hour time of the event in HH:MM format, e.g., '14:30' or '09:00'." },
                  },
                  required: ["id"],
                },
              },
            ],
          },
        ],
      }
    });

    const textPart = result.text || "";
    const functionCalls = result.functionCalls || [];
    const launchApps = functionCalls
      .filter((p: any) => p.name === "launch_app")
      .map((p: any) => String(p.args?.app || "").trim())
      .filter(Boolean);
    
    res.json({ 
      text: textPart || (functionCalls.length ? "일정을 완벽하게 캐치해서 처리해둘게! 📝" : "이해했어! 바로 적용할게! ✨"), 
      newEvents: functionCalls.filter(p => p.name === "add_calendar_event").map(p => p.args) || [],
      removedEventIds: functionCalls.filter(p => p.name === "remove_calendar_event").map(p => p.args?.id) || [],
      updatedEvents: functionCalls.filter(p => p.name === "update_calendar_event").map(p => p.args) || [],
      launchApps
    });
  } catch (error: any) {
    console.error("Gemini API 호출 중 중대 에러 발생 (로컬 폴백 작동):", error);
    // API 장애 발생 시 크래시 방지 및 복구를 위해 로컬 챗봇 응답으로 긴급 전환 서비스
    const emergencyLocal = handleLocalChat(messages, calendarEvents);
    res.json(emergencyLocal);
  }
});

// 자동 알림 및 일정 스마트 추천 라우트 (Gemini 연동 + 로컬 지능형 폴백)
app.post("/api/recommend", async (req, res) => {
  const { calendarEvents } = req.body;
  const aiClient = getGeminiClient();

  // 1. API 키가 존재하지 않을 때 로컬 캘린더 데이터를 기반으로 한 지능형 한글 리마인드 응답 생성
  if (!aiClient) {
    if (!calendarEvents || calendarEvents.length === 0) {
      return res.json({
        message: "오늘부터 모레까지 예정된 큰 일정은 없어요! 기지개 한 번 켜고 편안하고 자유로운 하루를 활기차게 채워보아요 🍀🐾",
        type: "suggestion"
      });
    }

    // 다가오는 날짜 순으로 정렬하여 가장 가까운 주요 일정을 안내
    const sorted = [...calendarEvents].sort((a, b) => {
      const dtA = new Date(`${a.date}T${a.time || "00:00"}`);
      const dtB = new Date(`${b.date}T${b.time || "00:00"}`);
      return dtA.getTime() - dtB.getTime();
    });

    const nearest = sorted[0];
    const todayStr = new Date().toISOString().split('T')[0];
    let dateLabel = nearest.date;
    if (nearest.date === todayStr) {
      dateLabel = "오늘";
    }

    return res.json({
      message: `주인님! ${dateLabel} (${nearest.time || "낮"})에 예정된 **'${nearest.title}'** 일정이 있어요! 잊지 않게 기억하고 나랑 같이 준비해보아요! ✨📝`,
      type: "reminder"
    });
  }

  // 2. API 키가 있는 경우 정식 Gemini API 호출로 풍부한 추천 메시지 획득
  try {
    const prompt = `
      제공된 일정 목록(Calendar)은 오늘부터 모레(오늘+2일)까지에 해당하는 일정들입니다.
      해당 일정을 바탕으로 사용자에게 오늘이나 내일, 모레에 있을 유익하고 중요한 다가오는 일정을 리마인드하는 한글(Korean) 메시지를 작성해 주세요.
      
      일정 목록: ${JSON.stringify(calendarEvents)}
      
      지침:
      1. 만약 일정 목록에 일정이 하나도 없다면, 다가오는 일정이 없으니 가벼운 격려나 오늘 하루 행복하고 편안하게 보내라는 내용의 따뜻하고 귀여운 한글 메시지를 작성해 주세요. (예: "오늘부터 모레까진 중요한 일정이 없네요! 편안하게 하루를 즐겨보아요 🍀")
      2. 먹이나 놀기, 휴식 수치 등에 대한 내용은 절대 언급하지 마세요. 오직 일정 리마인드 혹은 빈 일정일 때의 응원/휴식 권유 메시지만 작성해야 합니다.
      3. 말투는 귀엽고 친밀하며 비서다운 리액션이 돋보이는 한글(Korean) 말투를 사용해 주세요. (예: "~해요!", "잊지 마세요! ✨")
      4. 출력 형식은 반드시 아래 JSON 형식을 지켜주세요.
      
      출력 JSON 형식:
      {
        "message": "사용자에게 전달할 한국어 보이스/텍스트 메시지",
        "type": "reminder" or "suggestion"
      }
    `;

    const result = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are Moni, a helpful and adorable Korean desktop pet secretary. You strictly output JSON in the requested format.",
        responseMimeType: "application/json",
      },
    });

    res.json(JSON.parse(result.text || "{}"));
  } catch (error) {
    console.error("추천 API 호출 중 에러 발생 (로컬 추천 리턴):", error);
    // API 오류 시 부드럽게 복구
    res.json({
      message: "오늘 하루도 알차고 보람차게 채워봐요! 내가 언제나 든든히 지켜줄게요! 🐾💖",
      type: "suggestion"
    });
  }
});

// Vite 미들웨어 및 정적 빌드 파일 서빙 설정 함수
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

// 서버 실행 구동 및 포트 바인딩
setupVite()
  .then(() => {
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`[통합 안내] Express 서버가 http://localhost:${PORT} 에서 활기차게 작동하기 시작했습니다! ⭐🏭`);
    });
    server.on('error', (err: any) => {
      console.error("Express 서버 런타임 오류:", err);
    });
  })
  .catch((err) => {
    console.error("서버 셋업 실패 로그:", err);
  });

