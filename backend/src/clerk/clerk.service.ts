import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient, type User, type Organization, type OrganizationMembership } from '@clerk/clerk-sdk-node';
import { ClerkConfig } from './clerk.config';

@Injectable()
export class ClerkService implements OnModuleInit {
  private readonly logger = new Logger(ClerkService.name);
  private client: ReturnType<typeof createClerkClient> | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const clerkConfig = this.configService.get<ClerkConfig>('clerk');
    
    if (!clerkConfig?.secretKey) {
      this.logger.warn('CLERK_SECRET_KEY not configured. Clerk features will be disabled.');
      return;
    }

    this.client = createClerkClient({
      secretKey: clerkConfig.secretKey,
      publishableKey: clerkConfig.publishableKey,
    });

    this.logger.log('Clerk client initialized');
  }

  getClient(): ReturnType<typeof createClerkClient> {
    if (!this.client) {
      throw new Error('Clerk client not initialized. Check CLERK_SECRET_KEY configuration.');
    }
    return this.client;
  }

  async getUser(userId: string): Promise<User | null> {
    try {
      return await this.getClient().users.getUser(userId);
    } catch (error) {
      this.logger.error(`Failed to get user ${userId}`, error);
      return null;
    }
  }

  async getUserList(params?: { limit?: number; offset?: number; emailAddress?: string[] }) {
    return this.getClient().users.getUserList(params);
  }

  async createUser(data: {
    emailAddress: string[];
    password?: string;
    firstName?: string;
    lastName?: string;
    publicMetadata?: Record<string, unknown>;
    privateMetadata?: Record<string, unknown>;
    unsafeMetadata?: Record<string, unknown>;
  }): Promise<User> {
    return this.getClient().users.createUser(data);
  }

  async updateUser(userId: string, data: {
    emailAddress?: string[];
    firstName?: string;
    lastName?: string;
    publicMetadata?: Record<string, unknown>;
    privateMetadata?: Record<string, unknown>;
    unsafeMetadata?: Record<string, unknown>;
  }): Promise<User> {
    return this.getClient().users.updateUser(userId, data);
  }

  async deleteUser(userId: string): Promise<User> {
    return this.getClient().users.deleteUser(userId);
  }

  async getOrganization(orgId: string): Promise<Organization | null> {
    try {
      return await this.getClient().organizations.getOrganization({ organizationId: orgId });
    } catch (error) {
      this.logger.error(`Failed to get organization ${orgId}`, error);
      return null;
    }
  }

  async createOrganization(data: {
    name: string;
    createdBy: string;
    slug?: string;
    publicMetadata?: Record<string, unknown>;
    privateMetadata?: Record<string, unknown>;
  }): Promise<Organization> {
    return this.getClient().organizations.createOrganization(data);
  }

  async updateOrganization(orgId: string, data: {
    name?: string;
    slug?: string;
    publicMetadata?: Record<string, unknown>;
    privateMetadata?: Record<string, unknown>;
  }): Promise<Organization> {
    return this.getClient().organizations.updateOrganization(orgId, data);
  }

  async deleteOrganization(orgId: string): Promise<Organization> {
    return this.getClient().organizations.deleteOrganization(orgId);
  }

  async getOrganizationMembershipList(orgId: string): Promise<OrganizationMembership[]> {
    return this.getClient().organizations.getOrganizationMembershipList({ organizationId: orgId });
  }

  async createOrganizationMembership(data: {
    organizationId: string;
    userId: string;
    role?: string;
    publicMetadata?: Record<string, unknown>;
    privateMetadata?: Record<string, unknown>;
  }): Promise<OrganizationMembership> {
    return this.getClient().organizations.createOrganizationMembership(data);
  }

  async updateOrganizationMembership(
    orgId: string,
    userId: string,
    data: { role?: string; publicMetadata?: Record<string, unknown>; privateMetadata?: Record<string, unknown> }
  ): Promise<OrganizationMembership> {
    return this.getClient().organizations.updateOrganizationMembership({ organizationId: orgId, userId }, data);
  }

  async deleteOrganizationMembership(orgId: string, userId: string): Promise<OrganizationMembership> {
    return this.getClient().organizations.deleteOrganizationMembership({ organizationId: orgId, userId });
  }

  async verifyToken(token: string): Promise<Record<string, unknown> | null> {
    try {
      return await this.getClient().verifyToken(token);
    } catch (error) {
      this.logger.error('Token verification failed', error);
      return null;
    }
  }

  async decodeToken(token: string): Promise<Record<string, unknown> | null> {
    try {
      const { decodeJwt } = await import('@clerk/clerk-sdk-node');
      return decodeJwt(token);
    } catch (error) {
      this.logger.error('Token decoding failed', error);
      return null;
    }
  }
}