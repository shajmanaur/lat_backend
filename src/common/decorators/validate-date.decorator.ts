import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export const IsValidDateFormat = (validationOptions?: ValidationOptions) => {
  return (object: Object, propertyName: string) => {
    registerDecorator({
      name: 'isValidDateFormat',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          // Strict regex for YYYY-MM-DD format
          if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)) {
            return false;
          }

          const [year, month, day] = value.split('-').map(Number);
          const date = new Date(year, month - 1, day);

          // Check valid date
          const isValidDate =
            date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day;

          // Ensure year is less than current year
          const currentYear = new Date().getFullYear();
          const isPastYear = year < currentYear; // - 17;

          return isValidDate && isPastYear;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid date in the format yyyy-mm-dd and year must be less than current year`;
        },
      },
    });
  };
};
