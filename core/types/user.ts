export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  street?: string;
  city?: string;
  zipCode?: string;
  createdAt: string;
  avatar?: string;
}
