import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface Response<T> {
  success: boolean;
  message?: string;
  data: T;
  statusCode: number;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const statusCode = context.switchToHttp().getResponse().statusCode || 200;
    return next.handle().pipe(
      map((data) => {
        // If data is already in standard format
        if (
          data &&
          typeof data === "object" &&
          "success" in data &&
          "data" in data
        ) {
          return data;
        }

        const isPlainObject =
          data && typeof data === "object" && !Array.isArray(data);

        return {
          success: true,
          ...(isPlainObject ? data : {}),
          data,
          statusCode,
        };
      }),
    );
  }
}
