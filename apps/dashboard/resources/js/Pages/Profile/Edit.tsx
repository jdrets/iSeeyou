import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    return (
        <AppLayout>
            <Head title="Profile" />

            <div className="mb-6">
                <h1 className="text-xl font-semibold text-foreground">
                    Profile
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    Manage your account settings
                </p>
            </div>

            <div className="space-y-4">
                <div className="glass rounded-lg p-6">
                    <UpdateProfileInformationForm
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                    />
                </div>

                <div className="glass rounded-lg p-6">
                    <UpdatePasswordForm />
                </div>
            </div>
        </AppLayout>
    );
}
