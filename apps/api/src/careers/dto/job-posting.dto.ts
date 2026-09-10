import { BadRequestException } from '@nestjs/common';
import {
  EmploymentType,
  JobLocation,
  JobPosting,
  JobPublishStatus,
} from '../entities/job-posting.entity';

/**
 * 관리자 입력.
 *
 * class-validator 를 새로 붙이지 않았다 — 이 저장소는 아직 그 의존성을 쓰지 않고,
 * 검증 파이프 하나 때문에 전역 설정을 바꾸면 다른 컨트롤러의 동작까지 흔들린다.
 * 대신 여기서 손으로 좁힌다. 신뢰 경계는 어차피 BFF 가 아니라 이 안쪽이다.
 */
export type JobPostingInput = Partial<
  Omit<JobPosting, 'id' | 'created_at' | 'updated_at' | 'view_count'>
>;

const LOCATIONS = Object.values(JobLocation) as string[];
const EMPLOYMENTS = Object.values(EmploymentType) as string[];
const STATUSES = Object.values(JobPublishStatus) as string[];

/** 관리자가 채울 수 있는 컬럼만 통과시킨다. 나머지는 조용히 버린다. */
const TEXT_FIELDS = [
  'department_key',
  'title_kr',
  'title_en',
  'title_vn',
  'department_kr',
  'department_en',
  'department_vn',
  'location_kr',
  'location_en',
  'location_vn',
  'employment_kr',
  'employment_en',
  'employment_vn',
  'experience_kr',
  'experience_en',
  'experience_vn',
  // description 은 required 목록에 없다 — KR 도 비워둘 수 있는 칸이다.
  'description_kr',
  'description_en',
  'description_vn',
] as const;

const ARRAY_FIELDS = [
  'tags_kr',
  'tags_en',
  'tags_vn',
  'responsibilities_kr',
  'responsibilities_en',
  'responsibilities_vn',
  'requirements_kr',
  'requirements_en',
  'requirements_vn',
  'preferred_kr',
  'preferred_en',
  'preferred_vn',
] as const;

const isBlank = (value: unknown) => typeof value !== 'string' || value.trim() === '';

export function sanitizeJobPostingInput(
  body: unknown,
  { partial }: { partial: boolean },
): JobPostingInput {
  if (typeof body !== 'object' || body === null) {
    throw new BadRequestException('본문이 비어 있습니다');
  }
  const raw = body as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const field of TEXT_FIELDS) {
    if (!(field in raw)) continue;
    const value = raw[field];
    if (value === null || value === undefined) {
      out[field] = null;
      continue;
    }
    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} 는 문자열이어야 합니다`);
    }
    out[field] = value.trim() === '' ? null : value.trim();
  }

  for (const field of ARRAY_FIELDS) {
    if (!(field in raw)) continue;
    const value = raw[field];
    if (value === null || value === undefined) {
      out[field] = null;
      continue;
    }
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
      throw new BadRequestException(`${field} 는 문자열 배열이어야 합니다`);
    }
    out[field] = (value as string[]).map((item) => item.trim()).filter(Boolean);
  }

  if ('location_key' in raw) {
    if (!LOCATIONS.includes(String(raw.location_key))) {
      throw new BadRequestException(`location_key 는 ${LOCATIONS.join(' | ')} 중 하나여야 합니다`);
    }
    out.location_key = raw.location_key;
  }

  if ('employment_type' in raw) {
    if (!EMPLOYMENTS.includes(String(raw.employment_type))) {
      throw new BadRequestException(
        `employment_type 은 ${EMPLOYMENTS.join(' | ')} 중 하나여야 합니다`,
      );
    }
    out.employment_type = raw.employment_type;
  }

  if ('publish_status' in raw) {
    if (!STATUSES.includes(String(raw.publish_status))) {
      throw new BadRequestException(`publish_status 는 ${STATUSES.join(' | ')} 중 하나여야 합니다`);
    }
    out.publish_status = raw.publish_status;
  }

  if ('deadline' in raw) {
    const value = raw.deadline;
    // NULL 은 "상시 채용"이라는 뜻이다. 빈 문자열도 같은 뜻으로 받는다.
    if (value === null || value === undefined || value === '') {
      out.deadline = null;
    } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      out.deadline = value;
    } else {
      throw new BadRequestException('deadline 은 YYYY-MM-DD 또는 null 이어야 합니다');
    }
  }

  if ('sort_order' in raw) {
    const value = Number(raw.sort_order);
    if (!Number.isInteger(value)) {
      throw new BadRequestException('sort_order 는 정수여야 합니다');
    }
    out.sort_order = value;
  }

  // KR 은 필수다. 생성할 때만 강제하고, 수정할 때는 보낸 필드만 본다.
  const required = [
    'department_key',
    'title_kr',
    'department_kr',
    'location_kr',
    'employment_kr',
    'experience_kr',
  ] as const;

  for (const field of required) {
    if (partial && !(field in raw)) continue;
    if (isBlank(out[field])) {
      throw new BadRequestException(`${field} 는 필수입니다`);
    }
  }

  return out as JobPostingInput;
}
