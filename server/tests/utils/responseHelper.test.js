const {
    success,
    created,
    updated,
    deleted,
    error,
    validationError,
    notFound,
    handleDbResult,
    handleQueryResult
} = require('../../utils/responseHelper');

describe('ResponseHelper', () => {
    let mockRes;

    beforeEach(() => {
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('success', () => {
        test('should send success response with default values', () => {
            success(mockRes);
            
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Success',
                data: null
            });
        });

        test('should send success response with custom data and message', () => {
            const data = { id: 1, name: 'Test' };
            const message = 'Custom success message';
            
            success(mockRes, data, message);
            
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message,
                data
            });
        });

        test('should send success response with custom status code', () => {
            success(mockRes, null, 'Success', 202);
            
            expect(mockRes.status).toHaveBeenCalledWith(202);
        });
    });

    describe('created', () => {
        test('should send created response', () => {
            const data = { id: 1 };
            
            created(mockRes, data);
            
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Created successfully',
                data
            });
        });
    });

    describe('updated', () => {
        test('should send updated response', () => {
            const data = { id: 1, updated: true };
            
            updated(mockRes, data);
            
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Updated successfully',
                data
            });
        });
    });

    describe('deleted', () => {
        test('should send deleted response', () => {
            deleted(mockRes);
            
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Deleted successfully',
                data: null
            });
        });
    });

    describe('error', () => {
        test('should send error response with default values', () => {
            error(mockRes);
            
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Internal Server Error',
                error: true
            });
        });

        test('should send error response with custom message and status', () => {
            const message = 'Custom error message';
            const statusCode = 400;
            
            error(mockRes, message, statusCode);
            
            expect(mockRes.status).toHaveBeenCalledWith(statusCode);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message,
                error: true
            });
        });

        test('should include details in development environment', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';
            
            const details = { stack: 'Error stack trace' };
            error(mockRes, 'Error message', 500, details);
            
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Error message',
                error: true,
                details
            });
            
            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('validationError', () => {
        test('should send validation error with single error', () => {
            const errors = 'Name is required';
            
            validationError(mockRes, errors);
            
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Validation failed',
                error: true,
                errors: [errors]
            });
        });

        test('should send validation error with multiple errors', () => {
            const errors = ['Name is required', 'Email is invalid'];
            
            validationError(mockRes, errors);
            
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Validation failed',
                error: true,
                errors
            });
        });
    });

    describe('notFound', () => {
        test('should send not found response with default resource', () => {
            notFound(mockRes);
            
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Resource not found',
                error: true
            });
        });

        test('should send not found response with custom resource', () => {
            notFound(mockRes, 'User');
            
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'User not found',
                error: true
            });
        });
    });

    describe('handleDbResult', () => {
        test('should handle create operation success', () => {
            const result = { lastInsertRowid: 1, changes: 1 };
            
            handleDbResult(mockRes, result, 'create', 'User');
            
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'User created successfully',
                data: { id: 1 }
            });
        });

        test('should handle update operation success', () => {
            const result = { changes: 1 };
            
            handleDbResult(mockRes, result, 'update', 'User');
            
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'User updated successfully',
                data: null
            });
        });

        test('should handle update operation with no changes', () => {
            const result = { changes: 0 };
            
            handleDbResult(mockRes, result, 'update', 'User');
            
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'User not found',
                error: true
            });
        });

        test('should handle delete operation success', () => {
            const result = { changes: 1 };
            
            handleDbResult(mockRes, result, 'delete', 'User');
            
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'User deleted successfully',
                data: null
            });
        });

        test('should handle null result', () => {
            handleDbResult(mockRes, null, 'update', 'User');
            
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'User not found',
                error: true
            });
        });
    });

    describe('handleQueryResult', () => {
        test('should handle array result', () => {
            const data = [{ id: 1, name: 'User 1' }, { id: 2, name: 'User 2' }];
            
            handleQueryResult(mockRes, data, 'Users');
            
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Users retrieved successfully',
                data
            });
        });

        test('should handle single object result', () => {
            const data = { id: 1, name: 'User 1' };
            
            handleQueryResult(mockRes, data, 'User');
            
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'User retrieved successfully',
                data
            });
        });

        test('should handle null result', () => {
            handleQueryResult(mockRes, null, 'User');
            
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'User not found',
                error: true
            });
        });

        test('should handle empty array result', () => {
            const data = [];
            
            handleQueryResult(mockRes, data, 'Users');
            
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Users retrieved successfully',
                data
            });
        });
    });
});
