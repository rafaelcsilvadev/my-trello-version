import { argon2, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Injectable } from '@nestjs/common';

const deriveKey = promisify(argon2);

const ALGORITHM = 'argon2id';
const MEMORY_KIB = 19456;
const PASSES = 2;
const PARALLELISM = 1;
const SALT_BYTES = 16;
const TAG_BYTES = 32;

const STORED_FORMAT =
  /^argon2id\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+={0,2})\$([A-Za-z0-9+/]+={0,2})$/;

// Same parameters as a real hash, so verifying against it costs the same time.
// Its tag is all zeros, which no password derives to in practice.
const DUMMY_HASH = formatStoredHash(
  Buffer.alloc(SALT_BYTES, 1),
  Buffer.alloc(TAG_BYTES),
);

interface StoredHash {
  memory: number;
  passes: number;
  parallelism: number;
  salt: Buffer;
  tag: Buffer;
}

@Injectable()
export class PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const tag = await deriveKey(ALGORITHM, {
      message: password,
      nonce: salt,
      memory: MEMORY_KIB,
      passes: PASSES,
      parallelism: PARALLELISM,
      tagLength: TAG_BYTES,
    });

    return formatStoredHash(salt, tag);
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const parsed = parseStoredHash(stored);
    if (!parsed) {
      return false;
    }

    let candidate: Buffer;
    try {
      candidate = await deriveKey(ALGORITHM, {
        message: password,
        nonce: parsed.salt,
        memory: parsed.memory,
        passes: parsed.passes,
        parallelism: parsed.parallelism,
        tagLength: parsed.tag.length,
      });
    } catch {
      // argon2 rejects out-of-range parameters; a stored hash carrying them is unusable.
      return false;
    }

    return timingSafeEqual(candidate, parsed.tag);
  }

  async verifyAgainstDummy(password: string): Promise<false> {
    await this.verify(password, DUMMY_HASH);
    return false;
  }
}

function formatStoredHash(salt: Buffer, tag: Buffer): string {
  return `${ALGORITHM}$m=${MEMORY_KIB},t=${PASSES},p=${PARALLELISM}$${salt.toString('base64')}$${tag.toString('base64')}`;
}

function parseStoredHash(stored: string): StoredHash | null {
  const match = STORED_FORMAT.exec(stored);
  if (!match) {
    return null;
  }

  const [, memory, passes, parallelism, salt, tag] = match;
  return {
    memory: Number(memory),
    passes: Number(passes),
    parallelism: Number(parallelism),
    salt: Buffer.from(salt, 'base64'),
    tag: Buffer.from(tag, 'base64'),
  };
}
