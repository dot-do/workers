// n is a regular JS Number (≤ 2^53-1)
export const isTimestamp = (n: number) => n > 0xFFFF_FFFF   // 4 294 967 295 max value for UInt32 (ie. xxHash32)