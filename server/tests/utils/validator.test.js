const { createValidator, validateSubscription } = require('../../utils/validator');

describe('Validator', () => {
    describe('createValidator', () => {
        test('should create a new validator instance', () => {
            const validator = createValidator();
            expect(validator).toBeDefined();
            expect(validator.hasErrors()).toBe(false);
            expect(validator.getErrors()).toHaveLength(0);
        });
    });

    describe('required validation', () => {
        test('should pass for valid values', () => {
            const validator = createValidator();
            validator.required('test', 'field');
            validator.required(123, 'number');
            validator.required(true, 'boolean');
            
            expect(validator.hasErrors()).toBe(false);
        });

        test('should fail for empty values', () => {
            const validator = createValidator();
            validator.required('', 'empty_string');
            validator.required(null, 'null_value');
            validator.required(undefined, 'undefined_value');
            
            expect(validator.hasErrors()).toBe(true);
            expect(validator.getErrors()).toHaveLength(3);
        });
    });

    describe('string validation', () => {
        test('should pass for string values', () => {
            const validator = createValidator();
            validator.string('test', 'field');
            validator.string('', 'empty_string');
            
            expect(validator.hasErrors()).toBe(false);
        });

        test('should fail for non-string values', () => {
            const validator = createValidator();
            validator.string(123, 'number');
            validator.string(true, 'boolean');
            validator.string({}, 'object');
            
            expect(validator.hasErrors()).toBe(true);
            expect(validator.getErrors()).toHaveLength(3);
        });
    });

    describe('number validation', () => {
        test('should pass for number values', () => {
            const validator = createValidator();
            validator.number(123, 'integer');
            validator.number(123.45, 'float');
            validator.number(0, 'zero');
            
            expect(validator.hasErrors()).toBe(false);
        });

        test('should fail for non-number values', () => {
            const validator = createValidator();
            validator.number('123', 'string');
            validator.number(true, 'boolean');
            validator.number(NaN, 'nan');
            
            expect(validator.hasErrors()).toBe(true);
            expect(validator.getErrors()).toHaveLength(3);
        });
    });

    describe('email validation', () => {
        test('should pass for valid email addresses', () => {
            const validator = createValidator();
            validator.email('test@example.com', 'email1');
            validator.email('user.name+tag@domain.co.uk', 'email2');
            
            expect(validator.hasErrors()).toBe(false);
        });

        test('should fail for invalid email addresses', () => {
            const validator = createValidator();
            validator.email('invalid-email', 'email1');
            validator.email('@domain.com', 'email2');
            validator.email('user@', 'email3');
            
            expect(validator.hasErrors()).toBe(true);
            expect(validator.getErrors()).toHaveLength(3);
        });
    });

    describe('length validation', () => {
        test('should pass for valid lengths', () => {
            const validator = createValidator();
            validator.length('test', 'field', 1, 10);
            validator.length('hello', 'field2', 5, 5);
            
            expect(validator.hasErrors()).toBe(false);
        });

        test('should fail for invalid lengths', () => {
            const validator = createValidator();
            validator.length('', 'empty', 1, 10);
            validator.length('toolongstring', 'long', 1, 5);
            
            expect(validator.hasErrors()).toBe(true);
            expect(validator.getErrors()).toHaveLength(2);
        });
    });

    describe('range validation', () => {
        test('should pass for values in range', () => {
            const validator = createValidator();
            validator.range(5, 'field', 1, 10);
            validator.range(1, 'min', 1, 10);
            validator.range(10, 'max', 1, 10);
            
            expect(validator.hasErrors()).toBe(false);
        });

        test('should fail for values out of range', () => {
            const validator = createValidator();
            validator.range(0, 'below_min', 1, 10);
            validator.range(11, 'above_max', 1, 10);
            
            expect(validator.hasErrors()).toBe(true);
            expect(validator.getErrors()).toHaveLength(2);
        });
    });

    describe('enum validation', () => {
        test('should pass for valid enum values', () => {
            const validator = createValidator();
            validator.enum('red', 'color', ['red', 'green', 'blue']);
            validator.enum('green', 'color2', ['red', 'green', 'blue']);
            
            expect(validator.hasErrors()).toBe(false);
        });

        test('should fail for invalid enum values', () => {
            const validator = createValidator();
            validator.enum('yellow', 'color', ['red', 'green', 'blue']);
            validator.enum('purple', 'color2', ['red', 'green', 'blue']);
            
            expect(validator.hasErrors()).toBe(true);
            expect(validator.getErrors()).toHaveLength(2);
        });
    });

    describe('custom validation', () => {
        test('should pass for valid custom validation', () => {
            const validator = createValidator();
            validator.custom('test', 'field', (value) => value.length > 2, 'Must be longer than 2 characters');
            
            expect(validator.hasErrors()).toBe(false);
        });

        test('should fail for invalid custom validation', () => {
            const validator = createValidator();
            validator.custom('ab', 'field', (value) => value.length > 2, 'Must be longer than 2 characters');
            
            expect(validator.hasErrors()).toBe(true);
            expect(validator.getErrors()[0].message).toBe('Must be longer than 2 characters');
        });
    });

    describe('throwIfErrors', () => {
        test('should not throw when no errors', () => {
            const validator = createValidator();
            validator.required('test', 'field');
            
            expect(() => validator.throwIfErrors()).not.toThrow();
        });

        test('should throw when errors exist', () => {
            const validator = createValidator();
            validator.required('', 'field');
            
            expect(() => validator.throwIfErrors()).toThrow();
        });
    });
});

describe('validateSubscription', () => {
    test('should pass for valid subscription data', () => {
        const validData = {
            name: 'Netflix',
            plan: 'Premium',
            billing_cycle: 'monthly',
            amount: 15.99,
            currency: 'USD',
            payment_method: 'credit_card',
            next_billing_date: '2024-01-01',
            start_date: '2023-01-01',
            status: 'active',
            renewal_type: 'auto',
            category: 'streaming',
            notes: 'Family plan',
            website: 'https://netflix.com'
        };

        const validator = validateSubscription(validData);
        expect(validator.hasErrors()).toBe(false);
    });

    test('should fail for missing required fields', () => {
        const invalidData = {
            // missing name, plan, billing_cycle, amount, currency, payment_method
        };

        const validator = validateSubscription(invalidData);
        expect(validator.hasErrors()).toBe(true);
        
        const errors = validator.getErrors();
        expect(errors.some(e => e.field === 'name')).toBe(true);
        expect(errors.some(e => e.field === 'plan')).toBe(true);
        expect(errors.some(e => e.field === 'billing_cycle')).toBe(true);
        expect(errors.some(e => e.field === 'amount')).toBe(true);
        expect(errors.some(e => e.field === 'currency')).toBe(true);
        expect(errors.some(e => e.field === 'payment_method')).toBe(true);
    });

    test('should fail for invalid billing cycle', () => {
        const invalidData = {
            name: 'Netflix',
            plan: 'Premium',
            billing_cycle: 'invalid_cycle',
            amount: 15.99,
            currency: 'USD',
            payment_method: 'credit_card'
        };

        const validator = validateSubscription(invalidData);
        expect(validator.hasErrors()).toBe(true);
        
        const errors = validator.getErrors();
        expect(errors.some(e => e.field === 'billing_cycle')).toBe(true);
    });

    test('should fail for invalid amount', () => {
        const invalidData = {
            name: 'Netflix',
            plan: 'Premium',
            billing_cycle: 'monthly',
            amount: -5,
            currency: 'USD',
            payment_method: 'credit_card'
        };

        const validator = validateSubscription(invalidData);
        expect(validator.hasErrors()).toBe(true);
        
        const errors = validator.getErrors();
        expect(errors.some(e => e.field === 'amount')).toBe(true);
    });

    test('should fail for invalid currency', () => {
        const invalidData = {
            name: 'Netflix',
            plan: 'Premium',
            billing_cycle: 'monthly',
            amount: 15.99,
            currency: 'INVALID',
            payment_method: 'credit_card'
        };

        const validator = validateSubscription(invalidData);
        expect(validator.hasErrors()).toBe(true);
        
        const errors = validator.getErrors();
        expect(errors.some(e => e.field === 'currency')).toBe(true);
    });
});
