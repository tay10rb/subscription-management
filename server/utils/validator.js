const { ValidationError } = require('../middleware/errorHandler');

/**
 * 数据验证工具类
 */
class Validator {
    constructor() {
        this.errors = [];
    }

    /**
     * 重置错误列表
     */
    reset() {
        this.errors = [];
        return this;
    }

    /**
     * 添加错误
     * @param {string} field - 字段名
     * @param {string} message - 错误消息
     */
    addError(field, message) {
        this.errors.push({ field, message });
        return this;
    }

    /**
     * 检查是否有错误
     * @returns {boolean}
     */
    hasErrors() {
        return this.errors.length > 0;
    }

    /**
     * 获取错误列表
     * @returns {Array}
     */
    getErrors() {
        return this.errors;
    }

    /**
     * 抛出验证错误
     */
    throwIfErrors() {
        if (this.hasErrors()) {
            const errorMessage = this.errors.map(err => `${err.field}: ${err.message}`).join(', ');
            throw new ValidationError(errorMessage);
        }
    }

    /**
     * 验证必填字段
     * @param {*} value - 值
     * @param {string} field - 字段名
     */
    required(value, field) {
        if (value === undefined || value === null || value === '') {
            this.addError(field, `${field} is required`);
        }
        return this;
    }

    /**
     * 验证字符串类型
     * @param {*} value - 值
     * @param {string} field - 字段名
     */
    string(value, field) {
        if (value !== undefined && value !== null && typeof value !== 'string') {
            this.addError(field, `${field} must be a string`);
        }
        return this;
    }

    /**
     * 验证数字类型
     * @param {*} value - 值
     * @param {string} field - 字段名
     */
    number(value, field) {
        if (value !== undefined && value !== null && (typeof value !== 'number' || isNaN(value))) {
            this.addError(field, `${field} must be a number`);
        }
        return this;
    }

    /**
     * 验证整数类型
     * @param {*} value - 值
     * @param {string} field - 字段名
     */
    integer(value, field) {
        if (value !== undefined && value !== null && (!Number.isInteger(Number(value)))) {
            this.addError(field, `${field} must be an integer`);
        }
        return this;
    }

    /**
     * 验证布尔类型
     * @param {*} value - 值
     * @param {string} field - 字段名
     */
    boolean(value, field) {
        if (value !== undefined && value !== null && typeof value !== 'boolean') {
            this.addError(field, `${field} must be a boolean`);
        }
        return this;
    }

    /**
     * 验证邮箱格式
     * @param {string} value - 值
     * @param {string} field - 字段名
     */
    email(value, field) {
        if (value && typeof value === 'string') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                this.addError(field, `${field} must be a valid email address`);
            }
        }
        return this;
    }

    /**
     * 验证URL格式
     * @param {string} value - 值
     * @param {string} field - 字段名
     */
    url(value, field) {
        if (value && typeof value === 'string') {
            try {
                new URL(value);
            } catch {
                this.addError(field, `${field} must be a valid URL`);
            }
        }
        return this;
    }

    /**
     * 验证日期格式
     * @param {string} value - 值
     * @param {string} field - 字段名
     */
    date(value, field) {
        if (value && typeof value === 'string') {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                this.addError(field, `${field} must be a valid date`);
            }
        }
        return this;
    }

    /**
     * 验证字符串长度
     * @param {string} value - 值
     * @param {string} field - 字段名
     * @param {number} min - 最小长度
     * @param {number} max - 最大长度
     */
    length(value, field, min = 0, max = Infinity) {
        if (value && typeof value === 'string') {
            if (value.length < min) {
                this.addError(field, `${field} must be at least ${min} characters long`);
            }
            if (value.length > max) {
                this.addError(field, `${field} must be no more than ${max} characters long`);
            }
        }
        return this;
    }

    /**
     * 验证数值范围
     * @param {number} value - 值
     * @param {string} field - 字段名
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     */
    range(value, field, min = -Infinity, max = Infinity) {
        if (value !== undefined && value !== null) {
            const num = Number(value);
            if (!isNaN(num)) {
                if (num < min) {
                    this.addError(field, `${field} must be at least ${min}`);
                }
                if (num > max) {
                    this.addError(field, `${field} must be no more than ${max}`);
                }
            }
        }
        return this;
    }

    /**
     * 验证枚举值
     * @param {*} value - 值
     * @param {string} field - 字段名
     * @param {Array} allowedValues - 允许的值列表
     */
    enum(value, field, allowedValues) {
        if (value !== undefined && value !== null && !allowedValues.includes(value)) {
            this.addError(field, `${field} must be one of: ${allowedValues.join(', ')}`);
        }
        return this;
    }

    /**
     * 验证数组类型
     * @param {*} value - 值
     * @param {string} field - 字段名
     */
    array(value, field) {
        if (value !== undefined && value !== null && !Array.isArray(value)) {
            this.addError(field, `${field} must be an array`);
        }
        return this;
    }

    /**
     * 验证对象类型
     * @param {*} value - 值
     * @param {string} field - 字段名
     */
    object(value, field) {
        if (value !== undefined && value !== null && (typeof value !== 'object' || Array.isArray(value))) {
            this.addError(field, `${field} must be an object`);
        }
        return this;
    }

    /**
     * 自定义验证函数
     * @param {*} value - 值
     * @param {string} field - 字段名
     * @param {Function} validatorFn - 验证函数，返回 true 表示验证通过
     * @param {string} message - 错误消息
     */
    custom(value, field, validatorFn, message) {
        if (value !== undefined && value !== null && !validatorFn(value)) {
            this.addError(field, message || `${field} is invalid`);
        }
        return this;
    }
}

/**
 * 创建新的验证器实例
 * @returns {Validator}
 */
function createValidator() {
    return new Validator();
}

/**
 * 验证订阅数据
 * @param {Object} data - 订阅数据
 * @returns {Validator}
 */
function validateSubscription(data) {
    const validator = createValidator();
    
    validator
        .required(data.name, 'name')
        .string(data.name, 'name')
        .length(data.name, 'name', 1, 255)
        
        .required(data.plan, 'plan')
        .string(data.plan, 'plan')
        .length(data.plan, 'plan', 1, 255)
        
        .required(data.billing_cycle, 'billing_cycle')
        .enum(data.billing_cycle, 'billing_cycle', ['monthly', 'yearly', 'quarterly'])
        
        .required(data.amount, 'amount')
        .number(data.amount, 'amount')
        .range(data.amount, 'amount', 0)
        
        .required(data.currency, 'currency')
        .string(data.currency, 'currency')
        .length(data.currency, 'currency', 3, 3)
        
        .required(data.payment_method, 'payment_method')
        .string(data.payment_method, 'payment_method')
        
        .date(data.next_billing_date, 'next_billing_date')
        .date(data.start_date, 'start_date')
        
        .enum(data.status, 'status', ['active', 'inactive', 'cancelled'])
        .enum(data.renewal_type, 'renewal_type', ['auto', 'manual'])
        
        .string(data.category, 'category')
        .string(data.notes, 'notes')
        .url(data.website, 'website');
    
    return validator;
}

module.exports = {
    Validator,
    createValidator,
    validateSubscription
};
