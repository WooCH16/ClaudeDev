'use strict';

/**
 * COAT Auto-Loop Plugin
 * Claude API를 통해 기획자·개발자·검증자 역할을 자동으로 수행하며 LOOP를 진행
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const Anthropic = require('@anthropic-ai/sdk');

const CHECKPOINT_ROUNDS = [6, 12, 18, 24];

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function readMemory(projectRoot) {
  const p = path.join(projectRoot, '.coat', 'state', 'memory.json');
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    console.error('❌ memory.json 읽기 실패:', p);
    process.exit(1);
  }
}

function writeMemory(projectRoot, memory) {
  const p = path.join(projectRoot, '.coat', 'state', 'memory.json');
  fs.writeFileSync(p, JSON.stringify(memory, null, 2));
}

function readConfig(projectRoot) {
  const p = path.join(projectRoot, '.coat', 'config.json');
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return {};
  }
}

function ensureAuditDir(projectRoot, feature) {
  const dir = path.join(projectRoot, '.coat', 'audit', 'auto-loop');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function askUser(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ─── Claude API 호출 ─────────────────────────────────────────────────────────

/**
 * 역할별 Claude API 호출
 * @param {Anthropic} client
 * @param {'developer'|'validator'|'planner'} role
 * @param {number} round
 * @param {object} context - { feature, checklist, prevDevResponse, prevValResponse }
 * @param {string} model
 * @returns {Promise<string>} JSON 문자열 응답
 */
async function callRole(client, role, round, context, model) {
  const { feature, checklist, prevDevResponse, prevValResponse } = context;
  const pendingItems = checklist.filter(i => !i.done).map(i => `- ${i.label}`).join('\n');

  const systemPrompts = {
    developer: `너는 "${feature}" 기능을 개발하는 시니어 개발자다. 체크리스트 항목을 구현하고 결과를 JSON으로 보고한다.`,
    validator: `너는 "${feature}" 기능을 검증하는 QA 엔지니어다. 개발 결과를 검증하고 이슈를 JSON으로 보고한다.`,
    planner: `너는 "${feature}" 기능의 기획자다. 검증 결과를 보고 Match Rate를 판단한다.`,
  };

  const userPrompts = {
    developer: `Round ${round}. 다음 미완료 항목을 구현하라:\n${pendingItems}\n\n이전 검증 이슈: ${prevValResponse || '없음'}\n\n다음 JSON 형식으로 답하라:\n{"implemented": ["항목1", ...], "remaining_issues": ["이슈1", ...], "summary": "한 줄 요약"}`,
    validator: `Round ${round}. 개발자 구현 결과를 검증하라:\n${prevDevResponse}\n\n전체 체크리스트:\n${checklist.map(i => `[${i.done ? 'X' : ' '}] ${i.label}`).join('\n')}\n\n다음 JSON 형식으로 답하라:\n{"issues": [{"title": "이슈명", "severity": "high|medium|low"}], "passed": ["통과항목1", ...], "summary": "한 줄 요약"}`,
    planner: `Round ${round}. 검증 결과를 보고 Match Rate를 평가하라:\n검증 결과: ${prevValResponse}\n전체 체크리스트: ${JSON.stringify(checklist)}\n\n다음 JSON 형식으로 답하라:\n{"matchRate": {"기능": 0~100, "UX": 0~100, "속도": 0~100}, "completedIds": ["a-01", ...], "summary": "한 줄 요약"}`,
  };

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: userPrompts[role] }],
    system: systemPrompts[role],
  });

  return response.content[0].text;
}

// ─── Match Rate 파싱 ──────────────────────────────────────────────────────────

function parseJsonSafe(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
}

/**
 * 기획자 역할로 Match Rate 산출 (a-03)
 * @param {Anthropic} client
 * @param {number} round
 * @param {object} context - { feature, checklist, prevValResponse }
 * @param {string} model
 * @returns {Promise<{matchRate: object, completedIds: string[], summary: string}>}
 */
async function judgeMatchRate(client, round, context, model) {
  const raw = await callRole(client, 'planner', round, context, model);
  const parsed = parseJsonSafe(raw);
  if (parsed?.matchRate) return parsed;
  // fallback: JSON 파싱 실패 시 이전 matchRate 유지
  const prevMr = (context.checklist || []).length > 0
    ? { '기능': 0, 'UX': 0, '속도': 0 }
    : { '기능': 0, 'UX': 0, '속도': 0 };
  return { matchRate: prevMr, completedIds: [], summary: raw.slice(0, 80) };
}

// ─── 라운드 로그 저장 ─────────────────────────────────────────────────────────

function saveRoundLog(projectRoot, feature, round, devRes, valRes, planRes) {
  const dir = ensureAuditDir(projectRoot, feature);
  const safeName = feature.replace(/[^a-zA-Z0-9가-힣]+/g, '-').replace(/^-|-$/g, '');
  const file = path.join(dir, `${safeName}-R${round}.md`);
  const content = `# Auto-Loop 라운드 로그 — Round ${round}

> 기능: ${feature}
> 날짜: ${new Date().toISOString().slice(0, 10)}

## [개발자]
\`\`\`json
${devRes}
\`\`\`

## [검증자]
\`\`\`json
${valRes}
\`\`\`

## [기획자]
\`\`\`json
${planRes}
\`\`\`
`;
  fs.writeFileSync(file, content);
}

// ─── 체크포인트 출력 ──────────────────────────────────────────────────────────

function printCheckpoint(round, memory, plannerResult) {
  const mr = plannerResult?.matchRate || memory.matchRate;
  const done = (memory.checklist || []).filter(i => i.done).length;
  const total = (memory.checklist || []).length;
  const issues = plannerResult?.issues || [];

  console.log('\n─────────────────────────────────────────');
  console.log(`Round ${round} 체크포인트 (자동 모드)`);
  console.log('─────────────────────────────────────────');
  console.log(`기능: ${mr?.['기능'] ?? 0}%  UX: ${mr?.['UX'] ?? 0}%  속도: ${mr?.['속도'] ?? 0}%`);
  console.log(`완료 항목: ${done} / ${total}`);
  console.log(`잔여 이슈: ${issues.length}개`);
  if (plannerResult?.summary) console.log(`\n[기획자] ${plannerResult.summary}`);
  console.log('─────────────────────────────────────────');
}

// ─── 메인: runAutoLoop ────────────────────────────────────────────────────────

/**
 * @param {string} projectRoot - 프로젝트 루트 경로
 * @param {object} options - { startRound: number }
 */
async function runAutoLoop(projectRoot, options = {}) {
  // 1. API Key 확인
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.');
    console.error('   export ANTHROPIC_API_KEY=sk-ant-...');
    process.exit(1);
  }

  // 2. 설정 & 메모리 로드
  const config = readConfig(projectRoot);
  const model = config?.claude?.model || 'claude-sonnet-4-6';
  let memory = readMemory(projectRoot);

  if (!memory.feature) {
    console.error('❌ memory.json에 feature가 없습니다. /coat cast 먼저 실행하세요.');
    process.exit(1);
  }

  const feature = memory.feature;
  const client = new Anthropic({ apiKey });

  console.log(`\n🧥 COAT Auto-Loop 시작 — ${feature}`);
  console.log(`   모델: ${model}`);
  console.log(`   팀: 기획자 · 개발자 · 검증자 · 통합 전문가\n`);

  let round = options.startRound && options.startRound > 0
    ? options.startRound
    : (memory.round || 0) + 1;
  let prevDevResponse = null;
  let prevValResponse = null;
  let consecutiveNoIssueRounds = 0;

  // 3. LOOP
  while (true) {
    console.log(`\n── Round ${round} ──────────────────────────`);
    memory = readMemory(projectRoot);

    const context = {
      feature,
      checklist: memory.checklist || [],
      prevDevResponse,
      prevValResponse,
    };

    // 개발자
    process.stdout.write(`[개발자] API 호출 중...`);
    let devRaw, devResult;
    try {
      devRaw = await callRole(client, 'developer', round, context, model);
      devResult = parseJsonSafe(devRaw);
      prevDevResponse = devRaw;
      console.log(` → ${devResult?.summary || '완료'}`);
    } catch (err) {
      console.error(`\n⚠️  개발자 API 오류 (R${round}): ${err.message}`);
      devRaw = `{"error": "${err.message}", "summary": "API 오류"}`;
      devResult = { summary: 'API 오류', implemented: [], remaining_issues: [] };
    }

    // 검증자
    process.stdout.write(`[검증자] API 호출 중...`);
    let valRaw, valResult;
    try {
      valRaw = await callRole(client, 'validator', round, { ...context, prevDevResponse }, model);
      valResult = parseJsonSafe(valRaw);
      prevValResponse = valRaw;
      console.log(` → ${valResult?.summary || '완료'}`);
    } catch (err) {
      console.error(`\n⚠️  검증자 API 오류 (R${round}): ${err.message}`);
      valRaw = `{"error": "${err.message}", "summary": "API 오류"}`;
      valResult = { summary: 'API 오류', issues: [], passed: [] };
    }

    // 기획자 (Match Rate 산출) — judgeMatchRate() 사용
    process.stdout.write(`[기획자] Match Rate 판단 중...`);
    let planResult;
    try {
      planResult = await judgeMatchRate(client, round, { ...context, prevValResponse }, model);
      console.log(` → ${planResult?.summary || '완료'}`);
    } catch (err) {
      console.error(`\n⚠️  기획자 API 오류 (R${round}): ${err.message}`);
      planResult = { matchRate: memory.matchRate, completedIds: [], summary: 'API 오류' };
    }
    const planRaw = JSON.stringify(planResult);

    // 체크리스트 업데이트
    if (planResult?.completedIds?.length) {
      memory.checklist = (memory.checklist || []).map(item =>
        planResult.completedIds.includes(item.id) ? { ...item, done: true } : item
      );
    }

    // matchRate 업데이트
    if (planResult?.matchRate) {
      memory.matchRate = planResult.matchRate;
    }

    // autoLog 추가
    if (!memory.autoLog) memory.autoLog = [];
    memory.autoLog.push({
      round,
      developer: devResult?.summary || '',
      validator: valResult?.summary || '',
      planner: planResult?.summary || '',
      matchRate: planResult?.matchRate || memory.matchRate,
    });

    memory.round = round;
    memory.phase = 'loop';
    writeMemory(projectRoot, memory);

    // 라운드 로그 저장
    saveRoundLog(projectRoot, feature, round, devRaw, valRaw, planRaw);

    // 이슈 없음 카운트
    const issueCount = valResult?.issues?.length || 0;
    consecutiveNoIssueRounds = issueCount === 0 ? consecutiveNoIssueRounds + 1 : 0;

    // 체크포인트 판단
    const isCheckpoint = CHECKPOINT_ROUNDS.includes(round);
    if (isCheckpoint) {
      printCheckpoint(round, memory, planResult);
      const answer = await askUser('\n계속 진행할까요? [y/n]: ');
      if (answer !== 'y' && answer !== 'yes' && answer !== '') {
        console.log('\n⏸️  Auto-Loop 중단됨. 재개하려면: /coat loop --auto 를 다시 실행하세요.');
        break;
      }
    }

    // 종료 조건 체크
    const mr = memory.matchRate || {};
    const goalMet = (mr['기능'] || 0) >= 97 && (mr['UX'] || 0) >= 85 && (mr['속도'] || 0) >= 80;
    const minRoundsMet = round >= 12;

    if (goalMet && consecutiveNoIssueRounds >= 3 && minRoundsMet) {
      console.log('\n✅ 종료 조건 충족!');
      console.log(`   기능 ${mr['기능']}% · UX ${mr['UX']}% · 속도 ${mr['속도']}%`);
      console.log(`   다음 단계: /coat align ${feature}\n`);
      break;
    }

    round++;
  }
}

module.exports = { runAutoLoop, callRole, judgeMatchRate, saveRoundLog };
