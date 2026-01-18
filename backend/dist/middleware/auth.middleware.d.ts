import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}
export declare const authenticate: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const authorize: (...roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const getOwnerFilter: (user: AuthRequest["user"]) => {
    ownerId?: undefined;
} | {
    ownerId: string;
};
export declare const getUserFilter: (user: AuthRequest["user"]) => {
    userId?: undefined;
} | {
    userId: string;
};
export declare const getDealAccessFilter: (user: AuthRequest["user"]) => {
    ownerId?: undefined;
    OR?: undefined;
} | {
    ownerId: string;
    OR?: undefined;
} | {
    OR: ({
        ownerId: string;
        salesTeam?: undefined;
    } | {
        salesTeam: {
            some: {
                id: string;
            };
        };
        ownerId?: undefined;
    })[];
    ownerId?: undefined;
};
//# sourceMappingURL=auth.middleware.d.ts.map