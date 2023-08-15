export default function PasswordForm({ translate }) {
  const passwordMismatchMessage = translate(
    'settings.security.change-password.message-new-password-missmatch',
  )
  return {
    formData: {
      password: '',
      passwordConfirmation: '',
    },
    formSchema: {
      password: {
        type: 'string',
        required: true,
        message: translate('settings.security.change-password.message-new-password-required'),
      },
      passwordConfirmation: [
        {
          validator(_rule, value, callback, source, _options) {
            var errors = []
            if (source.password !== value) {
              errors.push(new Error(passwordMismatchMessage))
            }
            callback(errors)
          },
        },
        {
          type: 'string',
          required: true,
          message: translate(
            'settings.security.change-password.message-new-password-confirm-required',
          ),
        },
      ],
    },
  }
}
