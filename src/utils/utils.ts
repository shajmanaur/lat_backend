import { createHmac } from 'crypto';
import { Like } from 'typeorm';
import { Workbook } from 'exceljs';
import { Response } from 'express';
import * as fs from 'fs';
import { BadRequestException, HttpException } from '@nestjs/common';

export function toBool(value: string): boolean {
  return value === 'true';
}

export function calculateOffset(page, limit) {
  return (page - 1) * limit;
}

export const generateRandomSixDigitsNumber = () => {
  const min = 100000;
  const max = 999999;

  return Math.floor(Math.random() * (max - min + 1) + min);
};

export const decorateApiResponse = (dto: any, response: any) => {
  return response.length <= 0
    ? [new dto()]
    : response.map((q) => Object.assign(new dto(), q));
};

export function deleteKeyFromObject(obj, key) {
  return delete obj[key];
}

export function getSlug(name): string {
  let slug = name;
  slug = slug.replace(/'/g, '');
  slug = slug.replace(/[^a-zA-Z0-9]/g, '-');
  return slug.toLowerCase();
}

export function createHashDigest(algorithm, secretKey, body) {
  return createHmac(algorithm, secretKey).update(body.toString()).digest('hex');
}

export function formatDateISOString(date: string) {
  return `${date.split('T')[0]} ${date.split('T')[1]}`;
}

export function calculateYearDifference(dateString: string): number {
  const givenDate = new Date(dateString);
  if (isNaN(givenDate.getTime())) {
    throw new Error('Invalid date format, expected YYYY-MM-DD');
  }

  const today = new Date();
  let years = today.getFullYear() - givenDate.getFullYear();

  // Adjust if the current date is before the current date in this year
  const hasDatePassed =
    today.getMonth() > givenDate.getMonth() ||
    (today.getMonth() === givenDate.getMonth() &&
      today.getDate() >= givenDate.getDate());

  if (!hasDatePassed) {
    years--;
  }

  return years;
}
