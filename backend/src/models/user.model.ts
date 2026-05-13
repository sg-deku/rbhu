// User model - configure based on your database
export interface IUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

const User: any = {};
export default User;
