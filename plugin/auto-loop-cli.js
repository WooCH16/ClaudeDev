#!/usr/bin/env node
'use strict';

/**
 * COAT Auto-Loop CLI 진입점 (a-04)
 * 사용법: node plugin/auto-loop-cli.js --auto [--from N]
 */

const path = require('path');

const args = process.argv.slice(2);

if (!args.includes('--auto')) {
  console.log('사용법: node plugin/auto-loop-cli.js --auto [--from N]');
  console.log('  --auto     자동 모드 활성화 (필수)');
  console.log('  --from N   N 라운드부터 재개 (선택, 기본값: 이전 round+1)');
  process.exit(0);
}

const fromIdx = args.indexOf('--from');
const startRound = fromIdx !== -1 ? parseInt(args[fromIdx + 1], 10) : undefined;

const projectRoot = process.cwd();
const { runAutoLoop } = require('./auto-loop.js');

runAutoLoop(projectRoot, { startRound }).catch(err => {
  console.error('❌ Auto-Loop 오류:', err.message);
  process.exit(1);
});
