#!/usr/bin/env node
// ADMIN_PASSWORD_HASH 생성기. 인자 없이 실행하면 입력이 화면에 안 보인다 (TTY 필요).
// 출력값을 apps/web/.env 에 넣는다. credentials.ts 의 hashPassword 와 같은 파라미터다.

import { randomBytes, scryptSync } from 'node:crypto'

const KEY_LENGTH = 64
const N = 16384
const r = 8
const p = 1
const MIN_LENGTH = 12

// 제어문자는 반드시 이스케이프로 쓴다. 소스에 리터럴로 넣으면
// 편집·복사 과정에서 조용히 사라지고, 그러면 비교가 전부 빗나간다.
const ESC = '\u001b' // 방향키·기능키 시퀀스의 시작
const ETX = '\u0003' // Ctrl-C
const EOT = '\u0004' // Ctrl-D
const DEL = '\u007f' // Backspace (대부분의 터미널)

function promptHidden(query) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process

    if (!stdin.isTTY) {
      reject(
        new Error(
          '숨김 입력은 실제 터미널에서만 됩니다 (지금 stdin 이 TTY 가 아닙니다).\n' +
            'PowerShell 또는 Windows Terminal 창을 직접 열어 다시 실행하세요:\n' +
            '  cd C:\\Projects\\Geniein\n' +
            '  node apps/web/scripts/hash-password.mjs\n\n' +
            "CI 처럼 대화형이 불가능한 곳에서만 인자로 넘기세요 (셸 기록에 남습니다):\n" +
            "  node apps/web/scripts/hash-password.mjs '비밀번호'",
        ),
      )
      return
    }

    stdout.write(query)
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')

    let value = ''

    const cleanup = () => {
      stdin.removeListener('data', onData)
      stdin.setRawMode(false)
      stdin.pause()
    }

    const onData = (chunk) => {
      // 방향키·기능키는 escape 시퀀스로 온다. 통째로 무시한다.
      if (chunk.startsWith(ESC)) return

      for (const char of chunk) {
        if (char === '\r' || char === '\n' || char === EOT) {
          cleanup()
          stdout.write('\n')
          resolve(value)
          return
        }
        if (char === ETX) {
          cleanup()
          stdout.write('\n중단했습니다.\n')
          process.exit(130)
        }
        if (char === DEL || char === '\b') {
          if (value.length > 0) {
            value = value.slice(0, -1)
            stdout.write('\b \b')
          }
          continue
        }
        // 나머지 제어문자는 버린다
        if (char < ' ') continue

        value += char
        stdout.write('*')
      }
    }

    stdin.on('data', onData)
  })
}

async function readPassword() {
  const fromArgs = process.argv[2]
  if (fromArgs) {
    console.error('⚠ 인자로 넘긴 비밀번호는 셸 명령 기록에 남습니다. 인자 없이 실행하면 가려서 입력받습니다.\n')
    return fromArgs
  }

  const password = await promptHidden('비밀번호: ')
  // 화면에 안 보이므로 오타를 잡을 방법이 확인 입력뿐이다.
  const confirm = await promptHidden('비밀번호 확인: ')

  if (password !== confirm) {
    console.error('두 입력이 다릅니다. 다시 실행하세요.')
    process.exit(1)
  }
  return password
}

// 설정 스크립트다. 스택 트레이스가 아니라 무엇을 하라는 안내가 나가야 한다.
const password = await readPassword().catch((error) => {
  console.error(error.message)
  process.exit(1)
})

if (password.length < MIN_LENGTH) {
  console.error(`비밀번호는 ${MIN_LENGTH}자 이상이어야 합니다. (입력: ${password.length}자)`)
  process.exit(1)
}

const salt = randomBytes(16)
const derived = scryptSync(password, salt, KEY_LENGTH, { N, r, p, maxmem: 64 * 1024 * 1024 })

console.log('\n아래 두 줄을 apps/web/.env 에 넣으세요:\n')
console.log(`ADMIN_PASSWORD_HASH=scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${derived.toString('hex')}`)
console.log(`AUTH_SECRET=${randomBytes(48).toString('base64')}`)
console.log('\n서비스 토큰도 필요합니다 (apps/web/.env 와 apps/api/.env 에 같은 값):\n')
console.log(`ADMIN_SERVICE_TOKEN=${randomBytes(32).toString('base64')}`)
