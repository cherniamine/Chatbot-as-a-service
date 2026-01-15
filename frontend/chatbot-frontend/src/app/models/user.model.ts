
export interface UserCreate {
  email: string;
  password: string;
  name: string;
  admin_id: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserInDB {
  id?: string;    
  email: string;
  name: string;
}   

export interface UserToken {
  access_token: string;
  token_type: string;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
}

export interface UserDetails {
  createdAt: string;
  lastLogin: string;
  username: string;
  emailVerified: boolean;
  role?: string;
}