import { ApiProperty } from '@nestjs/swagger';

//#region  Auto Decorate
export function AutoDecorate<T extends { new (...args: any[]): {} }>(
  constructor: T,
) {
  const keys = Object.keys(new constructor());
  keys.forEach((key) => {
    ApiProperty()(constructor.prototype, key);
  });
}
//#endregion Auto Decorate
