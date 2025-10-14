import {
	PASSWORD_RESET_REQUEST_TEMPLATE,
	PASSWORD_RESET_SUCCESS_TEMPLATE,
	VERIFICATION_EMAIL_TEMPLATE,
} from "./emailTemplates.js";
import { mailtrapClient, sender } from "./mailtrap.config.js";

export const enviarCorreoVerificacion = async (email, verificationToken) => {
	const recipient = [{ email }];

	try {
		const response = await mailtrapClient.send({
			from: sender,
			to: recipient,
			subject: "Verifica tu email",
			html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", verificationToken),
			category: "Verificación de email",
		});

		console.log("Email sent successfully", response);
	} catch (error) {
		console.error(`Error sending verification`, error);

		throw new Error(`Error sending verification email: ${error}`);
	}
};

export const enviarCorreoBienvenida = async (email, name) => {
	const recipient = [{ email }];

	try {
		const response = await mailtrapClient.send({
			from: sender,
			to: recipient,
			template_uuid: "b0512a39-5b0e-49cb-b128-14f9b3e0da05",
			template_variables: {
				company_info_name: "R&V SPA",
				name: name,
			},
		});

		console.log("Welcome email sent successfully", response);
	} catch (error) {
		console.error(`Error sending welcome email`, error);

		throw new Error(`Error sending welcome email: ${error}`);
	}
};

export const enviarCorreoRestablecimientoContraseña = async (email, resetURL) => {
	const recipient = [{ email }];

	console.log("📧 Preparando envío de email de reset a:", email);
	console.log("🔗 URL de reset:", resetURL);
	console.log("👤 Remitente configurado:", sender);

	try {
		console.log("🚀 Enviando email a través de Mailtrap...");
		
		const response = await mailtrapClient.send({
			from: sender,
			to: recipient,
			subject: "Reset your password",
			html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL),
			category: "Password Reset",
		});

		console.log("✅ Email enviado exitosamente:", response);
		console.log("📨 Response completo:", JSON.stringify(response, null, 2));
		
		return response;
	} catch (error) {
		console.error("❌ Error enviando email de reset:", error);
		console.error("📝 Stack trace:", error.stack);
		
		// Log más detalles del error
		if (error.response) {
			console.error("📊 Error response:", error.response);
		}
		if (error.message) {
			console.error("💬 Error message:", error.message);
		}

		throw new Error(`Error sending password reset email: ${error.message}`);
	}
};

export const enviarCorreoContraseñaRestablecida = async (email) => {
	const recipient = [{ email }];

	try {
		const response = await mailtrapClient.send({
			from: sender,
			to: recipient,
			subject: "Password Reset Successful",
			html: PASSWORD_RESET_SUCCESS_TEMPLATE,
			category: "Password Reset",
		});

		console.log("Password reset email sent successfully", response);
	} catch (error) {
		console.error(`Error sending password reset success email`, error);

		throw new Error(`Error sending password reset success email: ${error}`);
	}
};