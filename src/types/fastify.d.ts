import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: string;
      name: string;
      email: string;
      plan: "free" | "pro" | "enterprise";
      createdAt: Date;
      updatedAt: Date;
    };
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
