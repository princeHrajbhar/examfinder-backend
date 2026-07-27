type MultipartBody = Record<string, unknown>;

const hasOwn = (
  body: MultipartBody,
  key: string,
): boolean => Object.prototype.hasOwnProperty.call(body, key);

const asScalar = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value[value.length - 1];
  }

  return value;
};

const tryParseJson = (value: string): unknown => {
  const trimmed = value.trim();

  if (
    !trimmed ||
    (!trimmed.startsWith('[') && !trimmed.startsWith('{'))
  ) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => toStringArray(item))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value !== 'string') {
    return [];
  }

  const parsed = tryParseJson(value);

  if (parsed !== value) {
    return toStringArray(parsed);
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const readStringArray = (
  body: MultipartBody,
  field: string,
): string[] | undefined => {
  const keys = [field, `${field}[]`];
  let present = false;
  const values: string[] = [];

  for (const key of keys) {
    if (!hasOwn(body, key)) {
      continue;
    }

    present = true;
    values.push(...toStringArray(body[key]));
  }

  return present ? values : undefined;
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toObjectArray = (
  value: unknown,
): Record<string, unknown>[] => {
  if (typeof value === 'string') {
    const parsed = tryParseJson(value);

    if (parsed !== value) {
      return toObjectArray(parsed);
    }

    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) &&
        typeof item === 'object' &&
        !Array.isArray(item),
    );
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const numericKeys = Object.keys(record)
      .filter((key) => /^\d+$/.test(key))
      .sort((a, b) => Number(a) - Number(b));

    if (numericKeys.length) {
      return numericKeys.flatMap((key) =>
        toObjectArray(record[key]),
      );
    }

    return [record];
  }

  return [];
};

const readObjectArray = (
  body: MultipartBody,
  field: string,
  properties: readonly string[],
): Record<string, unknown>[] | undefined => {
  let present = false;
  const byIndex = new Map<number, Record<string, unknown>>();

  for (const directKey of [field, `${field}[]`]) {
    if (!hasOwn(body, directKey)) {
      continue;
    }

    present = true;

    toObjectArray(body[directKey]).forEach((item, index) => {
      byIndex.set(index, {
        ...(byIndex.get(index) || {}),
        ...item,
      });
    });
  }

  const propertyPattern = properties
    .map(escapeRegExp)
    .join('|');

  const bracketPattern = new RegExp(
    `^${escapeRegExp(field)}\\[(\\d+)\\]\\[(${propertyPattern})\\]$`,
  );

  for (const [key, rawValue] of Object.entries(body)) {
    const match = key.match(bracketPattern);

    if (!match) {
      continue;
    }

    present = true;

    const index = Number(match[1]);
    const property = match[2];

    byIndex.set(index, {
      ...(byIndex.get(index) || {}),
      [property]: String(asScalar(rawValue) ?? ''),
    });
  }

  if (!present) {
    return undefined;
  }

  return [...byIndex.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, value]) => value);
};

const readBoolean = (
  body: MultipartBody,
  field: string,
): boolean | undefined => {
  if (!hasOwn(body, field)) {
    return undefined;
  }

  const value = asScalar(body[field]);

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return false;
  }

  return ['true', '1', 'yes', 'on'].includes(
    value.trim().toLowerCase(),
  );
};

export interface NormalizedBlogMultipartBody {
  data: Record<string, unknown>;
  controls: {
    retainedFileStorageKeys?: string[];
    removeBanner?: boolean;
  };
}

export const normalizeBlogMultipartBody = (
  body: MultipartBody,
): NormalizedBlogMultipartBody => {
  const data: Record<string, unknown> = {};

  const scalarFields = [
    'title',
    'slug',
    'description',
    'category',
    'postingDate',
    'postedBy',
    'seoTitle',
    'seoDescription',
    'content',
    'status',
  ] as const;

  for (const field of scalarFields) {
    if (hasOwn(body, field)) {
      data[field] = asScalar(body[field]);
    }
  }

  const keyword = readStringArray(body, 'keyword');
  if (keyword !== undefined) {
    data.keyword = keyword;
  }

  const faq = readObjectArray(
    body,
    'faq',
    ['question', 'answer'],
  );
  if (faq !== undefined) {
    data.faq = faq;
  }

  const socialMediaLinks = readObjectArray(
    body,
    'socialMediaLinks',
    ['platform', 'url'],
  );
  if (socialMediaLinks !== undefined) {
    data.socialMediaLinks = socialMediaLinks;
  }

  const resourceLinks = readObjectArray(
    body,
    'resourceLinks',
    ['title', 'url'],
  );
  if (resourceLinks !== undefined) {
    data.resourceLinks = resourceLinks;
  }

  return {
    data,
    controls: {
      retainedFileStorageKeys: readStringArray(
        body,
        'retainedFileStorageKeys',
      ),
      removeBanner: readBoolean(body, 'removeBanner'),
    },
  };
};
