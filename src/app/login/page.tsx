import { redirect } from 'next/navigation';

// Redirect all /login requests to /admin/login
export default function LoginRedirect() {
  redirect('/admin/login');
}
