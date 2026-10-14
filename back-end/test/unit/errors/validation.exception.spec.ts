import { BadRequestException } from '@nestjs/common';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
  validate,
} from 'class-validator';
import {
  RequestValidationException,
  validationExceptionFactory,
} from '../../../src/errors/validation.exception';

class AddressDto {
  @IsString()
  city: string;
}

class CreateUserDto {
  @IsString()
  @MaxLength(3)
  name: string;

  @ValidateNested()
  @Type(() => AddressDto)
  @IsNotEmpty()
  address: AddressDto;
}

async function mapErrors(body: object): Promise<RequestValidationException> {
  const errors = await validate(plainToInstance(CreateUserDto, body), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return validationExceptionFactory(errors);
}

describe('validationExceptionFactory', () => {
  it('returns a 400 RequestValidationException', async () => {
    const exception = await mapErrors({ name: 1, address: { city: 'Rio' } });

    expect(exception).toBeInstanceOf(BadRequestException);
    expect(exception.getStatus()).toBe(400);
  });

  it('lists one field error per failed constraint', async () => {
    const exception = await mapErrors({ name: 1, address: { city: 'Rio' } });

    expect(exception.fieldErrors).toEqual(
      expect.arrayContaining([
        { field: 'name', message: 'name must be a string' },
        {
          field: 'name',
          message: 'name must be shorter than or equal to 3 characters',
        },
      ]),
    );
    expect(exception.fieldErrors).toHaveLength(2);
  });

  it('uses a dotted path for a nested property', async () => {
    const exception = await mapErrors({ name: 'Ana', address: { city: 7 } });

    expect(exception.fieldErrors).toEqual([
      { field: 'address.city', message: 'city must be a string' },
    ]);
  });

  it('lists a property not declared in the contract with its name', async () => {
    const exception = await mapErrors({
      name: 'Ana',
      address: { city: 'Rio', zip: '1' },
      role: 'admin',
    });

    expect(exception.fieldErrors).toEqual(
      expect.arrayContaining([
        { field: 'role', message: 'property role should not exist' },
        { field: 'address.zip', message: 'property zip should not exist' },
      ]),
    );
    expect(exception.fieldErrors).toHaveLength(2);
  });
});
