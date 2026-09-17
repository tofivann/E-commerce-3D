import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

type Bloque = { tipo: "p"; texto: string } | { tipo: "ul"; items: string[] };

interface Seccion {
  titulo: string;
  bloques: Bloque[];
}

interface Documento {
  titulo: string;
  actualizado: string;
  intro: string;
  secciones: Seccion[];
}

const p = (texto: string): Bloque => ({ tipo: "p", texto });
const ul = (items: string[]): Bloque => ({ tipo: "ul", items });

// El contenido legal es un documento largo y de una sola vez, no texto de UI
// repetido — para no inflar es.json/en.json con decenas de claves de párrafos
// sueltos, se mantiene aquí como dos bloques de datos (ES/EN) seleccionados
// por i18n.language, en vez de pasar cada párrafo por t(). Los Términos y
// Condiciones son el texto provisto directamente por el negocio (2026-09-17);
// la versión en español es una traducción fiel de ese mismo texto.
const CONTENIDO: Record<"privacidad" | "terminos", Record<"es" | "en", Documento>> = {
  privacidad: {
    es: {
      titulo: "Política de Privacidad",
      actualizado: "Última actualización: 17 de septiembre de 2026",
      intro:
        "En MimiMMDart nos tomamos en serio la privacidad de nuestros usuarios. Esta política explica qué datos recopilamos, para qué los usamos y con quién los compartimos al usar nuestro catálogo de modelos 3D y nuestro servicio de comisiones personalizadas.",
      secciones: [
        {
          titulo: "1. Datos que recopilamos",
          bloques: [
            p("Al crear una cuenta: tu nombre, correo electrónico y una contraseña (guardada siempre cifrada, nunca en texto plano)."),
            p("Si inicias sesión con Google: tu nombre y correo asociados a tu cuenta de Google, provistos directamente por Google bajo tu autorización explícita."),
            p("Al solicitar una comisión personalizada: el nombre del personaje, referencias (fotos, links de video) que tú mismo subes, y cualquier información adicional que incluyas en el formulario."),
            p("Al realizar una compra o pagar una suscripción: el historial de tu orden (productos, monto, fecha, estado del pago). No almacenamos los datos de tu tarjeta ni de tu cuenta de PayPal — esos datos los procesa directamente Stripe o PayPal, nunca pasan por nuestros servidores."),
          ],
        },
        {
          titulo: "2. Para qué usamos tus datos",
          bloques: [
            p("Para crear y administrar tu cuenta, y darte acceso al catálogo según tu estado de suscripción."),
            p("Para procesar tus compras y comisiones, y entregarte los archivos digitales correspondientes."),
            p("Para enviarte correos transaccionales (confirmación de pago, comisión completada, recuperación de contraseña) a través de nuestro proveedor de correo, Resend."),
            p("Para brindarte soporte a través del chat integrado en el sitio."),
          ],
        },
        {
          titulo: "3. Con quién compartimos datos",
          bloques: [
            p("No vendemos tus datos personales a nadie. Los compartimos únicamente con los proveedores que necesitamos para operar el servicio, cada uno bajo su propia política de privacidad: Stripe y PayPal (procesamiento de pagos), Google (inicio de sesión, si eliges usarlo) y Resend (envío de correos transaccionales)."),
          ],
        },
        {
          titulo: "4. Cómo protegemos tus datos",
          bloques: [
            p("Toda la comunicación con el sitio viaja cifrada (HTTPS). Las contraseñas se almacenan con cifrado unidireccional (nunca en texto plano) y el acceso a tu cuenta se controla mediante tokens de sesión (JWT)."),
          ],
        },
        {
          titulo: "5. Tus derechos",
          bloques: [
            p("Puedes pedirnos en cualquier momento acceder a tus datos, corregirlos o eliminar tu cuenta por completo. Escríbenos a través del chat de soporte del sitio o al correo de contacto indicado abajo."),
          ],
        },
        {
          titulo: "6. Almacenamiento local",
          bloques: [
            p("Usamos el almacenamiento local de tu navegador (localStorage) para mantener tu sesión iniciada. No usamos cookies de rastreo de terceros con fines publicitarios."),
          ],
        },
        {
          titulo: "7. Menores de edad",
          bloques: [
            p("Este servicio no está dirigido a menores de 13 años, y no recopilamos deliberadamente datos de menores de esa edad."),
          ],
        },
        {
          titulo: "8. Cambios a esta política",
          bloques: [p("Podemos actualizar esta política ocasionalmente. Si hacemos cambios importantes, lo indicaremos en el sitio.")],
        },
        {
          titulo: "9. Contacto",
          bloques: [p("Para cualquier duda sobre esta política, escríbenos a contacto@mimimmdart.com.")],
        },
      ],
    },
    en: {
      titulo: "Privacy Policy",
      actualizado: "Last updated: September 17, 2026",
      intro:
        "At MimiMMDart we take our users' privacy seriously. This policy explains what data we collect, what we use it for, and who we share it with when you use our 3D model catalog and our custom commission service.",
      secciones: [
        {
          titulo: "1. Data we collect",
          bloques: [
            p("When you create an account: your name, email address, and a password (always stored encrypted, never in plain text)."),
            p("If you sign in with Google: your name and email associated with your Google account, provided directly by Google under your explicit authorization."),
            p("When you request a custom commission: the character's name, references (photos, video links) that you upload yourself, and any additional information you include in the form."),
            p("When you make a purchase or pay for a subscription: your order history (products, amount, date, payment status). We do not store your card or PayPal account details — those are processed directly by Stripe or PayPal and never pass through our servers."),
          ],
        },
        {
          titulo: "2. What we use your data for",
          bloques: [
            p("To create and manage your account, and grant you catalog access according to your subscription status."),
            p("To process your purchases and commissions, and deliver the corresponding digital files."),
            p("To send you transactional emails (payment confirmation, completed commission, password recovery) through our email provider, Resend."),
            p("To provide support through the chat built into the site."),
          ],
        },
        {
          titulo: "3. Who we share data with",
          bloques: [
            p("We do not sell your personal data to anyone. We only share it with the providers we need to operate the service, each under its own privacy policy: Stripe and PayPal (payment processing), Google (sign-in, if you choose to use it), and Resend (transactional emails)."),
          ],
        },
        {
          titulo: "4. How we protect your data",
          bloques: [
            p("All communication with the site is encrypted (HTTPS). Passwords are stored with one-way encryption (never in plain text), and account access is controlled through session tokens (JWT)."),
          ],
        },
        {
          titulo: "5. Your rights",
          bloques: [
            p("You can ask us at any time to access your data, correct it, or delete your account entirely. Reach us through the site's support chat or the contact email below."),
          ],
        },
        {
          titulo: "6. Local storage",
          bloques: [p("We use your browser's local storage (localStorage) to keep you signed in. We do not use third-party advertising tracking cookies.")],
        },
        {
          titulo: "7. Children's privacy",
          bloques: [p("This service is not directed at children under 13, and we do not knowingly collect data from children under that age.")],
        },
        {
          titulo: "8. Changes to this policy",
          bloques: [p("We may update this policy occasionally. If we make significant changes, we'll note it on the site.")],
        },
        {
          titulo: "9. Contact",
          bloques: [p("For any questions about this policy, write to us at contacto@mimimmdart.com.")],
        },
      ],
    },
  },
  terminos: {
    en: {
      titulo: "Terms & Conditions",
      actualizado: "Last Updated: September 13, 2026",
      intro:
        "Welcome to MimiMMDArt. By accessing this website, creating an account, placing an order, purchasing a digital product, requesting a commission, downloading a file, or using any MimiMMDArt service, you agree to these Terms & Conditions. Please read them carefully before purchasing.",
      secciones: [
        {
          titulo: "1. Acceptance of These Terms",
          bloques: [
            p("By completing a purchase or submitting a commission, you confirm that:"),
            ul([
              "You have read and accepted these Terms & Conditions.",
              "The information provided with your order is accurate.",
              "You are legally permitted to make the purchase.",
              "You understand that MimiMMDArt primarily provides digital products and custom digital services.",
              "You understand the refund, delivery, licensing, and commission rules described below.",
            ]),
            p("If you do not agree with these Terms, please do not purchase or use the services."),
            p("Nothing in these Terms removes any consumer right that cannot legally be waived under applicable law."),
          ],
        },
        {
          titulo: "2. Digital Products",
          bloques: [
            p("Products sold through the MimiMMDArt Shop are digital products."),
            p("No physical product will be shipped unless a product page specifically states otherwise."),
            p("Digital products may include, but are not limited to:"),
            ul([
              "MMD models",
              "Model preparations or conversions",
              "Motions",
              "Camera motions",
              "Facial animations",
              "VRChat-related files",
              "Vroid/MMD-related files",
              "Animation files",
              "Downloadable digital assets",
            ]),
            p("A digital product is considered delivered when it is made available for download through the customer's account, order page, email, or another delivery method indicated by MimiMMDArt."),
            p("MimiMMDArt may keep records showing when a digital product was made available, downloaded, accessed, or delivered."),
          ],
        },
        {
          titulo: "3. Digital Product Refund Policy",
          bloques: [
            p("Because digital products cannot normally be returned once delivered or downloaded, all completed digital-product sales are generally final."),
            p("Refunds will not normally be provided because:"),
            ul([
              "The customer changed their mind.",
              "The customer no longer wants the product.",
              "The customer purchased the wrong product.",
              "The customer failed to read the product description.",
              "The customer's computer or software does not meet the stated requirements.",
              "The customer modified the files and caused them to stop working.",
              "A third-party program, game, plugin, shader, engine, or platform later changed or stopped supporting the product.",
              "The customer expected something that was not included in the product description.",
            ]),
            p("If a product is materially different from its description or cannot be delivered because of a problem caused by MimiMMDArt, MimiMMDArt must first be given a reasonable opportunity to correct, replace, or properly deliver the product."),
            p("Nothing in this section overrides refund rights that are mandatory under applicable law or the rules of the payment provider."),
          ],
        },
        {
          titulo: "4. Commission Payments",
          bloques: [
            p("A commission is a custom service created or prepared specifically according to information provided by the customer."),
            p("The customer is responsible for reviewing all information, references, characters, outfits, videos, models, and other instructions before submitting the commission."),
            p("Once payment has been successfully received, the commission may move directly to In Progress."),
            p("Payment confirms the customer's agreement with:"),
            ul([
              "The commission description.",
              "The selected commission type.",
              "The information supplied by the customer.",
              "The price.",
              "These Terms & Conditions.",
            ]),
          ],
        },
        {
          titulo: "5. Commission Cancellations and Refunds",
          bloques: [
            p("Because commissions involve custom work and reserved work time, cancellation rights are limited once work has started."),
            p("Before work begins, MimiMMDArt may approve a cancellation and refund at its discretion, subject to payment-processing fees and any rights required by law."),
            p("After work has started, any refund may be reduced to account for work already performed."),
            p("After substantial work has been completed or the final files have been delivered, commissions are generally non-refundable except where required by law."),
            p("A customer cannot receive both the completed commission and a full refund for the same order."),
            p("If MimiMMDArt is unable to complete a commission, an appropriate refund may be provided for any portion of the service that was not completed."),
          ],
        },
        {
          titulo: "6. Revisions and Changes",
          bloques: [
            p("A commission includes only the work and revisions described on the commission page or otherwise agreed upon before the work begins."),
            p("Corrections required because MimiMMDArt did not follow the originally submitted instructions will be corrected when reasonably possible."),
            p("However, the following may require an additional payment:"),
            ul([
              "Changing the requested outfit.",
              "Changing the character.",
              "Changing references after work has started.",
              "Adding features not included in the original order.",
              "Major changes after approval.",
              "Additional revisions beyond those included with the commission.",
              "Changing the artistic or technical direction after work has already been completed.",
            ]),
            p("A customer's change of preference is not considered an error in the delivered commission."),
          ],
        },
        {
          titulo: "7. Customer Responsibility for References and Files",
          bloques: [
            p("Customers are responsible for ensuring that all files, models, textures, images, videos, audio, characters, and other materials they submit may legally be used for the requested purpose."),
            p("By submitting material to MimiMMDArt, the customer represents that they have the necessary rights, permissions, or lawful basis to provide that material for the requested service."),
            p("MimiMMDArt may reject or cancel an order where there is a reasonable concern regarding copyright, ownership, illegal content, fraud, or another legal issue."),
          ],
        },
        {
          titulo: "8. Third-Party Characters and Intellectual Property",
          bloques: [
            p("Many commissions or products may involve characters, games, models, designs, software, or intellectual property owned by third parties."),
            p("The purchase of a MimiMMDArt product or service does not transfer ownership of any third-party character, franchise, game, trademark, model, artwork, or other intellectual property."),
            p("All such rights remain with their respective owners."),
            p("Payment to MimiMMDArt covers the digital service, preparation, conversion, animation, modification, technical work, or original work provided by MimiMMDArt."),
            p("Customers are responsible for complying with the terms, licenses, and rules imposed by the original copyright or intellectual-property owner."),
            p("MimiMMDArt does not claim ownership of third-party intellectual property."),
          ],
        },
        {
          titulo: "9. License to Use Purchased Files",
          bloques: [
            p("Unless a product page specifically provides different licensing terms, purchasing a product gives the customer a limited, non-exclusive, non-transferable license to use the files."),
            p("Customers may generally use purchased files to create personal content such as:"),
            ul([
              "MMD videos",
              "Animations",
              "Renders",
              "Screenshots",
              "Videos",
              "Streams",
              "Other content allowed by the applicable product description and third-party rights",
            ]),
            p("Purchasing a file does not give permission to:"),
            ul([
              "Resell the original files.",
              "Redistribute the files.",
              "Upload the files for others to download.",
              "Share purchased files with people who did not purchase them.",
              "Claim MimiMMDArt's work as their own.",
              "Sell modified versions of the files unless explicitly authorized.",
              "Remove credits or ownership information where credit is required.",
              "Circumvent download or account restrictions.",
              "Use the files to operate a competing download or redistribution service.",
              "Scrape or mass-download MimiMMDArt content.",
              "Use MimiMMDArt files as training data for AI or machine-learning systems without written permission.",
            ]),
            p("A separate license may be required when a product page specifically states so."),
          ],
        },
        {
          titulo: "10. File Structure and Modifications",
          bloques: [
            p("Certain MMD models, shaders, textures, motions, or other files depend on their original file names, folder structure, paths, or associated files."),
            p("Customers must follow the installation and usage instructions provided with the product."),
            p("For example, renaming, moving, deleting, replacing, or reorganizing files may cause shaders, textures, materials, motions, or other components to stop working."),
            p("MimiMMDArt is not responsible for problems caused by customer modifications to the delivered files."),
            p("Support may be refused for problems caused by modifying the original structure or configuration."),
          ],
        },
        {
          titulo: "11. Software and Platform Compatibility",
          bloques: [
            p("MimiMMDArt only guarantees compatibility with software, versions, or platforms specifically stated in the product description or commission agreement."),
            p("MimiMMDArt cannot guarantee that files will continue working indefinitely after updates to third-party software or platforms such as:"),
            ul(["MikuMikuDance", "Unity", "VRChat", "Blender", "Plugins", "Shaders", "Games", "Operating systems", "Other third-party tools"]),
            p("Updates made by third parties are outside MimiMMDArt's control."),
          ],
        },
        {
          titulo: "12. Commission Delivery and File Retention",
          bloques: [
            p("A commission is considered delivered when the completed files are made available to the customer through their account, download page, email, or another communicated delivery method."),
            p("Customers are responsible for downloading and safely backing up their completed files."),
            p("Commission download files may be automatically removed from MimiMMDArt's servers after the download period displayed to the customer, including when applicable 24 hours after the customer's first successful download."),
            p("MimiMMDArt is not required to permanently store delivered commission files."),
            p("Customers should create their own backups immediately after delivery."),
          ],
        },
        {
          titulo: "13. Deadlines",
          bloques: [
            p("Any estimated completion time is an estimate unless MimiMMDArt specifically guarantees a deadline in writing."),
            p("Completion times may change because of:"),
            ul([
              "Complexity.",
              "Customer-requested changes.",
              "Missing information.",
              "Delayed customer responses.",
              "Technical problems.",
              "Illness or emergencies.",
              "Internet or hosting problems.",
              "Events outside MimiMMDArt's reasonable control.",
            ]),
            p("If MimiMMDArt requires information from the customer, the commission timeline may be paused until that information is received."),
          ],
        },
        {
          titulo: "14. Publishing and Showcasing Commission Work",
          bloques: [
            p("Unless privacy or exclusivity has been specifically agreed to before purchase, MimiMMDArt may display completed work in its:"),
            ul(["Portfolio", "Website", "Shop previews", "Social media", "Promotional images", "Videos", "Commission examples"]),
            p("MimiMMDArt may also reuse MimiMMDArt-created technical work, modifications, or original elements where legally permitted."),
            p("A commission does not automatically grant the customer exclusivity unless exclusivity has specifically been purchased or agreed to in writing."),
            p("However, MimiMMDArt will not knowingly resell or distribute customer-owned private source files or third-party assets where MimiMMDArt does not have permission to distribute them."),
            p("Any publication or resale remains subject to the rights of the original intellectual-property owner."),
          ],
        },
        {
          titulo: "15. Payments",
          bloques: [
            p("Payments are processed through the payment methods offered on the website."),
            p("An order is not considered paid until payment has been successfully received and confirmed."),
            p("Customers are responsible for:"),
            ul([
              "Selecting the correct product.",
              "Providing correct billing information.",
              "Ensuring they are authorized to use the payment method.",
              "Any currency-conversion charges imposed by their bank or payment provider.",
              "Any taxes or charges legally applicable to them.",
            ]),
            p("MimiMMDArt may cancel or review transactions reasonably suspected of fraud, unauthorized payment activity, payment abuse, or security problems."),
          ],
        },
        {
          titulo: "16. Payment Disputes and Chargebacks",
          bloques: [
            p("Customers experiencing a genuine problem with an order are strongly encouraged to contact Mimi Support before opening a payment dispute so that MimiMMDArt has an opportunity to resolve the problem."),
            p("Opening a payment dispute does not automatically establish that MimiMMDArt failed to provide the purchased product or service."),
            p("When responding to a dispute, MimiMMDArt may provide the payment provider or financial institution with relevant evidence, including:"),
            ul([
              "Order information.",
              "The product description.",
              "Acceptance of these Terms.",
              "Commission instructions.",
              "Communication records.",
              "Delivery records.",
              "Download records.",
              "Account-access records.",
              "Dates and timestamps.",
              "Evidence showing that the requested service was completed.",
            ]),
            p("Payment-provider and card-network rules remain applicable and cannot be overridden by these Terms."),
            p("Customers who knowingly submit fraudulent, abusive, duplicate, or materially false payment disputes may have their MimiMMDArt accounts suspended or permanently terminated."),
            p("Where permitted by law, MimiMMDArt reserves the right to seek payment for valid unpaid balances and costs resulting from fraudulent activity."),
          ],
        },
        {
          titulo: "17. Accounts",
          bloques: [
            p("Customers are responsible for maintaining the security of their account."),
            p("Customers may not:"),
            ul([
              "Share accounts for the purpose of avoiding purchases.",
              "Create additional accounts to evade a suspension or ban.",
              "Access another customer's account without permission.",
              "Use automated systems to abuse the website.",
              "Attempt to bypass purchasing or download restrictions.",
              "Attempt to damage or compromise the website.",
              "Attempt to gain unauthorized administrative access.",
            ]),
            p("MimiMMDArt may temporarily or permanently suspend accounts involved in fraud, abuse, security threats, repeated Terms violations, or illegal activity."),
          ],
        },
        {
          titulo: "18. Favorites and Profile Features",
          bloques: [
            p("Favorites, profile pictures, account customization, and similar website features are provided for convenience."),
            p("MimiMMDArt does not guarantee permanent storage of favorite lists or profile information."),
            p("Users must not upload profile images or account content that they do not have permission to use."),
          ],
        },
        {
          titulo: "19. Posts, Comments and User Content",
          bloques: [
            p("Where MimiMMDArt allows users to post comments, images, videos, profile pictures, or other content, users remain responsible for what they upload."),
            p("Users may not post:"),
            ul([
              "Illegal content.",
              "Copyrighted material they are not permitted to use.",
              "Malware or malicious links.",
              "Spam.",
              "Threats.",
              "Harassment.",
              "Doxxing or private personal information.",
              "Impersonation.",
              "Fraudulent content.",
              "Content intended to compromise the website or another user's account.",
            ]),
            p("By posting content publicly, the user gives MimiMMDArt a non-exclusive license to host, display, reproduce, and technically process that content as necessary to operate the website."),
            p("MimiMMDArt may remove content or restrict accounts where reasonably necessary to enforce these Terms or protect the website and its users."),
          ],
        },
        {
          titulo: "20. Reviews and Criticism",
          bloques: [
            p("MimiMMDArt does not prohibit customers from sharing genuine opinions or honest reviews of their experience."),
            p("However, reviews and public communications do not give anyone permission to engage in:"),
            ul([
              "Harassment.",
              "Threats.",
              "Doxxing.",
              "Impersonation.",
              "Fraud.",
              "Spam.",
              "Knowingly false factual accusations.",
              "Attempts to compromise the website.",
              "Unauthorized publication of private information.",
            ]),
            p("MimiMMDArt reserves the right to report unlawful conduct, remove prohibited content from platforms it controls, and take reasonable measures to protect its users and services."),
            p("A customer will not be penalized merely because they express an honest negative opinion."),
          ],
        },
        {
          titulo: "21. Harassment and Abuse",
          bloques: [
            p("Mimi Support exists to assist customers with legitimate questions and problems."),
            p("Harassment, threats, repeated abusive messages, discrimination, doxxing, intimidation, spam, or abusive behavior toward MimiMMDArt or other users will not be tolerated."),
            p("MimiMMDArt may restrict communication or terminate access for users who engage in serious or repeated abusive behavior."),
            p("This section does not prevent a customer from making a legitimate complaint or exercising a legal consumer right."),
          ],
        },
        {
          titulo: "22. Right to Refuse Service",
          bloques: [
            p("To the extent permitted by law, MimiMMDArt reserves the right to refuse or cancel an order when reasonably necessary because of:"),
            ul([
              "Fraud.",
              "Payment abuse.",
              "Harassment.",
              "Security threats.",
              "Illegal requests.",
              "Intellectual-property concerns.",
              "Repeated violations of these Terms.",
              "Requests that MimiMMDArt cannot reasonably fulfill.",
            ]),
            p("Any refund legally due following a cancellation by MimiMMDArt will still be provided."),
          ],
        },
        {
          titulo: "23. Website Availability",
          bloques: [
            p("MimiMMDArt does not guarantee that the website will operate without interruption at all times."),
            p("Temporary interruptions may occur because of maintenance, hosting problems, third-party services, internet outages, software updates, attacks, technical failures, or circumstances outside MimiMMDArt's reasonable control."),
            p("MimiMMDArt will make reasonable efforts to maintain the service but is not responsible for temporary downtime outside its reasonable control."),
          ],
        },
        {
          titulo: "24. Disclaimer of Warranties",
          bloques: [
            p('To the fullest extent permitted by applicable law, the website, digital products, and services are provided on an "as available" basis and according to the descriptions provided at the time of purchase.'),
            p("MimiMMDArt does not make guarantees that are not expressly stated on the relevant product or commission page."),
            p("Nothing in this section removes warranties or consumer protections that cannot legally be excluded."),
          ],
        },
        {
          titulo: "25. Limitation of Liability",
          bloques: [
            p("To the fullest extent permitted by law, MimiMMDArt will not be liable for indirect, incidental, special, consequential, or similar losses resulting from the use or inability to use the website or digital files."),
            p("Where legally permitted, MimiMMDArt's total liability relating to an individual order will not exceed the amount actually paid to MimiMMDArt for that specific order."),
            p("This limitation does not apply where applicable law does not allow liability to be limited."),
          ],
        },
        {
          titulo: "26. Customer Indemnification",
          bloques: [
            p("To the extent permitted by law, the customer agrees to be responsible for claims, damages, or expenses resulting from:"),
            ul([
              "Material the customer supplied without the necessary rights.",
              "The customer's illegal use of delivered files.",
              "The customer's unauthorized redistribution or resale of files.",
              "The customer's violation of third-party intellectual-property rights.",
              "Fraud or intentional misuse of the website.",
            ]),
            p("This section does not make the customer responsible for wrongdoing caused solely by MimiMMDArt."),
          ],
        },
        {
          titulo: "27. Copyright and Intellectual-Property Complaints",
          bloques: [
            p("MimiMMDArt respects intellectual-property rights."),
            p("If a rights holder believes that content available through MimiMMDArt infringes their rights, they may contact Mimi Support with sufficient information to identify:"),
            ul(["The protected work.", "The allegedly infringing content.", "The location of the content on the website.", "Their contact information.", "The basis for their rights."]),
            p("MimiMMDArt may remove or restrict content while a legitimate intellectual-property complaint is reviewed."),
          ],
        },
        {
          titulo: "28. Privacy",
          bloques: [
            p("Use of personal information is also governed by the MimiMMDArt Privacy Policy."),
            p("Customers should review the Privacy Policy to understand how information relating to accounts, orders, communications, payments, and website usage is handled."),
          ],
        },
        {
          titulo: "29. Changes to These Terms",
          bloques: [
            p("MimiMMDArt may update these Terms & Conditions when necessary."),
            p("The current version and its update date will be displayed on the website."),
            p("Unless required otherwise by law, an order will generally remain subject to the version of the Terms accepted when that order was placed."),
            p("Continued use of the website after new Terms become effective constitutes acceptance of the updated Terms for future use of the service."),
          ],
        },
        {
          titulo: "30. Severability",
          bloques: [
            p("If one part of these Terms is found invalid or unenforceable, the remaining sections will remain effective to the extent permitted by law."),
            p("The invalid provision will be interpreted as closely as legally possible to its original intended purpose."),
          ],
        },
        {
          titulo: "31. No Waiver",
          bloques: [p("If MimiMMDArt does not immediately enforce a provision of these Terms, that does not mean MimiMMDArt permanently gives up the right to enforce that provision later.")],
        },
        {
          titulo: "32. Governing Law",
          bloques: [
            p("To the extent permitted by applicable law, these Terms and any dispute relating to MimiMMDArt will be governed by the laws applicable to MimiMMDArt's place of establishment."),
            p("Mandatory consumer-protection laws applicable to a customer's country or jurisdiction are not excluded where they legally cannot be waived."),
          ],
        },
        {
          titulo: "33. Contact",
          bloques: [
            p("Questions, order problems, copyright concerns, and other requests regarding these Terms should be submitted through Mimi Support or through the official contact information displayed on MimiMMDArt.com."),
            p("By purchasing from MimiMMDArt, submitting a commission, creating an account, or downloading a purchased product, you confirm that you have read and agree to these Terms & Conditions."),
          ],
        },
      ],
    },
    es: {
      titulo: "Términos y Condiciones",
      actualizado: "Última actualización: 13 de septiembre de 2026",
      intro:
        "Bienvenido a MimiMMDArt. Al acceder a este sitio web, crear una cuenta, realizar un pedido, comprar un producto digital, solicitar una comisión, descargar un archivo o usar cualquier servicio de MimiMMDArt, aceptas estos Términos y Condiciones. Léelos con atención antes de comprar.",
      secciones: [
        {
          titulo: "1. Aceptación de estos Términos",
          bloques: [
            p("Al completar una compra o enviar una solicitud de comisión, confirmas que:"),
            ul([
              "Has leído y aceptado estos Términos y Condiciones.",
              "La información proporcionada con tu pedido es correcta.",
              "Estás legalmente autorizado para realizar la compra.",
              "Entiendes que MimiMMDArt ofrece principalmente productos digitales y servicios digitales personalizados.",
              "Entiendes las reglas de reembolso, entrega, licencia y comisiones descritas más abajo.",
            ]),
            p("Si no estás de acuerdo con estos Términos, por favor no compres ni uses los servicios."),
            p("Nada en estos Términos elimina ningún derecho del consumidor que no pueda renunciarse legalmente bajo la ley aplicable."),
          ],
        },
        {
          titulo: "2. Productos digitales",
          bloques: [
            p("Los productos vendidos a través de la tienda de MimiMMDArt son productos digitales."),
            p("No se enviará ningún producto físico, a menos que la página del producto indique específicamente lo contrario."),
            p("Los productos digitales pueden incluir, entre otros:"),
            ul([
              "Modelos MMD",
              "Preparaciones o conversiones de modelos",
              "Motions (movimientos/animaciones)",
              "Movimientos de cámara",
              "Animaciones faciales",
              "Archivos relacionados con VRChat",
              "Archivos relacionados con Vroid/MMD",
              "Archivos de animación",
              "Activos digitales descargables",
            ]),
            p("Un producto digital se considera entregado cuando queda disponible para descarga a través de la cuenta del cliente, la página del pedido, el correo electrónico, u otro método de entrega indicado por MimiMMDArt."),
            p("MimiMMDArt puede conservar registros que muestren cuándo un producto digital fue puesto a disposición, descargado, accedido o entregado."),
          ],
        },
        {
          titulo: "3. Política de reembolso de productos digitales",
          bloques: [
            p("Debido a que los productos digitales normalmente no pueden devolverse una vez entregados o descargados, todas las ventas completadas de productos digitales son, en general, definitivas."),
            p("Normalmente no se otorgarán reembolsos porque:"),
            ul([
              "El cliente cambió de opinión.",
              "El cliente ya no quiere el producto.",
              "El cliente compró el producto equivocado.",
              "El cliente no leyó la descripción del producto.",
              "El equipo o software del cliente no cumple con los requisitos indicados.",
              "El cliente modificó los archivos y provocó que dejaran de funcionar.",
              "Un programa, juego, plugin, shader, motor o plataforma de terceros cambió o dejó de dar soporte al producto más adelante.",
              "El cliente esperaba algo que no estaba incluido en la descripción del producto.",
            ]),
            p("Si un producto es sustancialmente distinto de su descripción, o no puede entregarse por un problema causado por MimiMMDArt, primero se le debe dar a MimiMMDArt una oportunidad razonable de corregir, reemplazar o entregar correctamente el producto."),
            p("Nada en esta sección anula los derechos de reembolso obligatorios según la ley aplicable o las reglas del proveedor de pago."),
          ],
        },
        {
          titulo: "4. Pagos de comisiones",
          bloques: [
            p("Una comisión es un servicio personalizado creado o preparado específicamente según la información proporcionada por el cliente."),
            p("El cliente es responsable de revisar toda la información, referencias, personajes, vestuarios, videos, modelos y demás instrucciones antes de enviar la solicitud de comisión."),
            p("Una vez recibido el pago con éxito, la comisión puede pasar directamente a estado \"En proceso\"."),
            p("El pago confirma que el cliente está de acuerdo con:"),
            ul([
              "La descripción de la comisión.",
              "El tipo de comisión seleccionado.",
              "La información proporcionada por el cliente.",
              "El precio.",
              "Estos Términos y Condiciones.",
            ]),
          ],
        },
        {
          titulo: "5. Cancelaciones y reembolsos de comisiones",
          bloques: [
            p("Debido a que las comisiones implican trabajo personalizado y tiempo de trabajo reservado, el derecho a cancelar es limitado una vez que el trabajo ha comenzado."),
            p("Antes de que el trabajo comience, MimiMMDArt puede aprobar una cancelación y reembolso a su discreción, sujeto a las comisiones de procesamiento de pago y a los derechos exigidos por ley."),
            p("Después de que el trabajo haya comenzado, cualquier reembolso puede reducirse para tener en cuenta el trabajo ya realizado."),
            p("Después de que se haya completado una parte sustancial del trabajo, o de que se hayan entregado los archivos finales, las comisiones generalmente no son reembolsables, salvo que la ley lo exija."),
            p("Un cliente no puede recibir al mismo tiempo la comisión completada y un reembolso total por el mismo pedido."),
            p("Si MimiMMDArt no puede completar una comisión, se puede otorgar un reembolso adecuado por la parte del servicio que no se completó."),
          ],
        },
        {
          titulo: "6. Revisiones y cambios",
          bloques: [
            p("Una comisión incluye únicamente el trabajo y las revisiones descritas en la página de la comisión, o acordadas de otra forma antes de que el trabajo comience."),
            p("Las correcciones necesarias porque MimiMMDArt no siguió las instrucciones originalmente enviadas se corregirán cuando sea razonablemente posible."),
            p("Sin embargo, lo siguiente puede requerir un pago adicional:"),
            ul([
              "Cambiar el vestuario solicitado.",
              "Cambiar el personaje.",
              "Cambiar las referencias después de que el trabajo haya comenzado.",
              "Agregar características no incluidas en el pedido original.",
              "Cambios mayores después de la aprobación.",
              "Revisiones adicionales más allá de las incluidas con la comisión.",
              "Cambiar la dirección artística o técnica después de que el trabajo ya haya sido completado.",
            ]),
            p("Un cambio de preferencia del cliente no se considera un error en la comisión entregada."),
          ],
        },
        {
          titulo: "7. Responsabilidad del cliente sobre referencias y archivos",
          bloques: [
            p("Los clientes son responsables de asegurarse de que todos los archivos, modelos, texturas, imágenes, videos, audio, personajes y demás materiales que envíen puedan usarse legalmente para el propósito solicitado."),
            p("Al enviar material a MimiMMDArt, el cliente declara que cuenta con los derechos, permisos o base legal necesarios para proporcionar ese material para el servicio solicitado."),
            p("MimiMMDArt puede rechazar o cancelar un pedido cuando exista una preocupación razonable relacionada con derechos de autor, propiedad, contenido ilegal, fraude u otro problema legal."),
          ],
        },
        {
          titulo: "8. Personajes de terceros y propiedad intelectual",
          bloques: [
            p("Muchas comisiones o productos pueden involucrar personajes, juegos, modelos, diseños, software u otra propiedad intelectual perteneciente a terceros."),
            p("La compra de un producto o servicio de MimiMMDArt no transfiere la propiedad de ningún personaje, franquicia, juego, marca, modelo, obra de arte u otra propiedad intelectual de terceros."),
            p("Todos esos derechos permanecen con sus respectivos dueños."),
            p("El pago a MimiMMDArt cubre el servicio digital, la preparación, conversión, animación, modificación, trabajo técnico u obra original proporcionada por MimiMMDArt."),
            p("Los clientes son responsables de cumplir con los términos, licencias y reglas impuestas por el dueño original de los derechos de autor o de la propiedad intelectual."),
            p("MimiMMDArt no reclama la propiedad de la propiedad intelectual de terceros."),
          ],
        },
        {
          titulo: "9. Licencia de uso de los archivos comprados",
          bloques: [
            p("A menos que la página de un producto establezca específicamente términos de licencia distintos, comprar un producto le otorga al cliente una licencia limitada, no exclusiva e intransferible para usar los archivos."),
            p("Los clientes generalmente pueden usar los archivos comprados para crear contenido personal como:"),
            ul(["Videos de MMD", "Animaciones", "Renders", "Capturas de pantalla", "Videos", "Streams", "Otro contenido permitido por la descripción del producto aplicable y los derechos de terceros"]),
            p("Comprar un archivo no da permiso para:"),
            ul([
              "Revender los archivos originales.",
              "Redistribuir los archivos.",
              "Subir los archivos para que otros los descarguen.",
              "Compartir los archivos comprados con personas que no los compraron.",
              "Presentar el trabajo de MimiMMDArt como propio.",
              "Vender versiones modificadas de los archivos, salvo autorización explícita.",
              "Eliminar créditos o información de titularidad cuando el crédito sea obligatorio.",
              "Evadir restricciones de descarga o de cuenta.",
              "Usar los archivos para operar un servicio competidor de descarga o redistribución.",
              "Extraer o descargar masivamente el contenido de MimiMMDArt.",
              "Usar los archivos de MimiMMDArt como datos de entrenamiento para IA o sistemas de aprendizaje automático sin permiso por escrito.",
            ]),
            p("Puede requerirse una licencia distinta cuando la página de un producto lo indique específicamente."),
          ],
        },
        {
          titulo: "10. Estructura de archivos y modificaciones",
          bloques: [
            p("Ciertos modelos MMD, shaders, texturas, motions u otros archivos dependen de sus nombres de archivo, estructura de carpetas, rutas o archivos asociados originales."),
            p("Los clientes deben seguir las instrucciones de instalación y uso proporcionadas con el producto."),
            p("Por ejemplo, renombrar, mover, eliminar, reemplazar o reorganizar archivos puede provocar que shaders, texturas, materiales, motions u otros componentes dejen de funcionar."),
            p("MimiMMDArt no es responsable de los problemas causados por modificaciones del cliente a los archivos entregados."),
            p("El soporte puede ser rechazado para problemas causados por modificar la estructura o configuración original."),
          ],
        },
        {
          titulo: "11. Compatibilidad de software y plataformas",
          bloques: [
            p("MimiMMDArt solo garantiza compatibilidad con el software, versiones o plataformas indicadas específicamente en la descripción del producto o en el acuerdo de la comisión."),
            p("MimiMMDArt no puede garantizar que los archivos sigan funcionando indefinidamente después de actualizaciones de software o plataformas de terceros como:"),
            ul(["MikuMikuDance", "Unity", "VRChat", "Blender", "Plugins", "Shaders", "Juegos", "Sistemas operativos", "Otras herramientas de terceros"]),
            p("Las actualizaciones realizadas por terceros están fuera del control de MimiMMDArt."),
          ],
        },
        {
          titulo: "12. Entrega de comisiones y retención de archivos",
          bloques: [
            p("Una comisión se considera entregada cuando los archivos completados quedan disponibles para el cliente a través de su cuenta, página de descarga, correo electrónico u otro método de entrega comunicado."),
            p("Los clientes son responsables de descargar y respaldar de forma segura sus archivos completados."),
            p("Los archivos de descarga de comisiones pueden eliminarse automáticamente de los servidores de MimiMMDArt después del período de descarga mostrado al cliente, incluyendo, cuando corresponda, 24 horas después de la primera descarga exitosa del cliente."),
            p("MimiMMDArt no está obligado a almacenar permanentemente los archivos de comisiones entregados."),
            p("Los clientes deben crear sus propias copias de respaldo inmediatamente después de la entrega."),
          ],
        },
        {
          titulo: "13. Plazos de entrega",
          bloques: [
            p("Cualquier tiempo estimado de finalización es solo una estimación, a menos que MimiMMDArt garantice específicamente un plazo por escrito."),
            p("Los tiempos de finalización pueden cambiar debido a:"),
            ul([
              "Complejidad.",
              "Cambios solicitados por el cliente.",
              "Información faltante.",
              "Respuestas tardías del cliente.",
              "Problemas técnicos.",
              "Enfermedad o emergencias.",
              "Problemas de internet o de hosting.",
              "Eventos fuera del control razonable de MimiMMDArt.",
            ]),
            p("Si MimiMMDArt necesita información del cliente, el cronograma de la comisión puede pausarse hasta recibir esa información."),
          ],
        },
        {
          titulo: "14. Publicación y exhibición del trabajo de comisión",
          bloques: [
            p("A menos que se haya acordado específicamente privacidad o exclusividad antes de la compra, MimiMMDArt puede mostrar el trabajo completado en su:"),
            ul(["Portafolio", "Sitio web", "Vistas previas de la tienda", "Redes sociales", "Imágenes promocionales", "Videos", "Ejemplos de comisiones"]),
            p("MimiMMDArt también puede reutilizar el trabajo técnico, modificaciones o elementos originales creados por MimiMMDArt cuando esté legalmente permitido."),
            p("Una comisión no otorga automáticamente exclusividad al cliente, a menos que la exclusividad haya sido comprada o acordada específicamente por escrito."),
            p("Sin embargo, MimiMMDArt no revenderá ni distribuirá a sabiendas archivos fuente privados propiedad del cliente ni activos de terceros para los cuales MimiMMDArt no tenga permiso de distribución."),
            p("Cualquier publicación o reventa sigue estando sujeta a los derechos del dueño original de la propiedad intelectual."),
          ],
        },
        {
          titulo: "15. Pagos",
          bloques: [
            p("Los pagos se procesan a través de los métodos de pago ofrecidos en el sitio web."),
            p("Un pedido no se considera pagado hasta que el pago se haya recibido y confirmado con éxito."),
            p("Los clientes son responsables de:"),
            ul([
              "Seleccionar el producto correcto.",
              "Proporcionar información de facturación correcta.",
              "Asegurarse de estar autorizados para usar el método de pago.",
              "Cualquier cargo por conversión de moneda impuesto por su banco o proveedor de pago.",
              "Cualquier impuesto o cargo legalmente aplicable.",
            ]),
            p("MimiMMDArt puede cancelar o revisar transacciones razonablemente sospechosas de fraude, actividad de pago no autorizada, abuso de pago o problemas de seguridad."),
          ],
        },
        {
          titulo: "16. Disputas de pago y contracargos",
          bloques: [
            p("Se recomienda encarecidamente a los clientes que tengan un problema genuino con un pedido que contacten a Mimi Support antes de abrir una disputa de pago, para que MimiMMDArt tenga la oportunidad de resolver el problema."),
            p("Abrir una disputa de pago no establece automáticamente que MimiMMDArt no haya entregado el producto o servicio comprado."),
            p("Al responder a una disputa, MimiMMDArt puede proporcionar al proveedor de pago o entidad financiera evidencia relevante, incluyendo:"),
            ul([
              "Información del pedido.",
              "La descripción del producto.",
              "La aceptación de estos Términos.",
              "Las instrucciones de la comisión.",
              "Registros de comunicación.",
              "Registros de entrega.",
              "Registros de descarga.",
              "Registros de acceso a la cuenta.",
              "Fechas y marcas de tiempo.",
              "Evidencia que demuestre que el servicio solicitado fue completado.",
            ]),
            p("Las reglas del proveedor de pago y de la red de tarjetas siguen siendo aplicables y no pueden ser anuladas por estos Términos."),
            p("Los clientes que presenten a sabiendas disputas de pago fraudulentas, abusivas, duplicadas o materialmente falsas pueden ver suspendidas o eliminadas permanentemente sus cuentas de MimiMMDArt."),
            p("Cuando lo permita la ley, MimiMMDArt se reserva el derecho de reclamar el pago de saldos pendientes válidos y los costos resultantes de la actividad fraudulenta."),
          ],
        },
        {
          titulo: "17. Cuentas",
          bloques: [
            p("Los clientes son responsables de mantener la seguridad de su cuenta."),
            p("Los clientes no pueden:"),
            ul([
              "Compartir cuentas con el propósito de evitar compras.",
              "Crear cuentas adicionales para evadir una suspensión o expulsión.",
              "Acceder a la cuenta de otro cliente sin permiso.",
              "Usar sistemas automatizados para abusar del sitio web.",
              "Intentar evadir restricciones de compra o de descarga.",
              "Intentar dañar o comprometer el sitio web.",
              "Intentar obtener acceso administrativo no autorizado.",
            ]),
            p("MimiMMDArt puede suspender temporal o permanentemente cuentas involucradas en fraude, abuso, amenazas de seguridad, violaciones repetidas de estos Términos o actividad ilegal."),
          ],
        },
        {
          titulo: "18. Favoritos y funciones de perfil",
          bloques: [
            p("Los favoritos, fotos de perfil, personalización de cuenta y funciones similares del sitio se ofrecen por conveniencia."),
            p("MimiMMDArt no garantiza el almacenamiento permanente de las listas de favoritos ni de la información de perfil."),
            p("Los usuarios no deben subir imágenes de perfil ni contenido de cuenta que no tengan permiso de usar."),
          ],
        },
        {
          titulo: "19. Publicaciones, comentarios y contenido de usuario",
          bloques: [
            p("Cuando MimiMMDArt permite a los usuarios publicar comentarios, imágenes, videos, fotos de perfil u otro contenido, los usuarios siguen siendo responsables de lo que suban."),
            p("Los usuarios no pueden publicar:"),
            ul([
              "Contenido ilegal.",
              "Material con derechos de autor que no tienen permiso de usar.",
              "Malware o enlaces maliciosos.",
              "Spam.",
              "Amenazas.",
              "Acoso.",
              "Doxxing o información personal privada.",
              "Suplantación de identidad.",
              "Contenido fraudulento.",
              "Contenido destinado a comprometer el sitio web o la cuenta de otro usuario.",
            ]),
            p("Al publicar contenido públicamente, el usuario le otorga a MimiMMDArt una licencia no exclusiva para alojar, mostrar, reproducir y procesar técnicamente ese contenido según sea necesario para operar el sitio."),
            p("MimiMMDArt puede eliminar contenido o restringir cuentas cuando sea razonablemente necesario para hacer cumplir estos Términos o proteger el sitio y a sus usuarios."),
          ],
        },
        {
          titulo: "20. Reseñas y críticas",
          bloques: [
            p("MimiMMDArt no prohíbe a los clientes compartir opiniones genuinas o reseñas honestas sobre su experiencia."),
            p("Sin embargo, las reseñas y comunicaciones públicas no le dan permiso a nadie para:"),
            ul([
              "Acosar.",
              "Amenazar.",
              "Hacer doxxing.",
              "Suplantar identidad.",
              "Cometer fraude.",
              "Hacer spam.",
              "Hacer acusaciones fácticas falsas a sabiendas.",
              "Intentar comprometer el sitio web.",
              "Publicar información privada sin autorización.",
            ]),
            p("MimiMMDArt se reserva el derecho de reportar conductas ilegales, eliminar contenido prohibido de las plataformas que controla, y tomar medidas razonables para proteger a sus usuarios y servicios."),
            p("Un cliente no será penalizado simplemente por expresar una opinión negativa honesta."),
          ],
        },
        {
          titulo: "21. Acoso y abuso",
          bloques: [
            p("Mimi Support existe para ayudar a los clientes con preguntas y problemas legítimos."),
            p("No se tolerará el acoso, amenazas, mensajes abusivos repetidos, discriminación, doxxing, intimidación, spam o comportamiento abusivo hacia MimiMMDArt u otros usuarios."),
            p("MimiMMDArt puede restringir la comunicación o cancelar el acceso a usuarios que incurran en comportamiento abusivo grave o repetido."),
            p("Esta sección no impide que un cliente presente una queja legítima o ejerza un derecho legal como consumidor."),
          ],
        },
        {
          titulo: "22. Derecho a rechazar el servicio",
          bloques: [
            p("En la medida permitida por la ley, MimiMMDArt se reserva el derecho de rechazar o cancelar un pedido cuando sea razonablemente necesario debido a:"),
            ul([
              "Fraude.",
              "Abuso de pago.",
              "Acoso.",
              "Amenazas de seguridad.",
              "Solicitudes ilegales.",
              "Preocupaciones de propiedad intelectual.",
              "Violaciones repetidas de estos Términos.",
              "Solicitudes que MimiMMDArt no pueda cumplir razonablemente.",
            ]),
            p("Cualquier reembolso legalmente debido tras una cancelación por parte de MimiMMDArt igualmente será otorgado."),
          ],
        },
        {
          titulo: "23. Disponibilidad del sitio web",
          bloques: [
            p("MimiMMDArt no garantiza que el sitio web funcione sin interrupciones en todo momento."),
            p("Pueden ocurrir interrupciones temporales debido a mantenimiento, problemas de hosting, servicios de terceros, cortes de internet, actualizaciones de software, ataques, fallas técnicas, o circunstancias fuera del control razonable de MimiMMDArt."),
            p("MimiMMDArt hará esfuerzos razonables por mantener el servicio, pero no es responsable de caídas temporales fuera de su control razonable."),
          ],
        },
        {
          titulo: "24. Exclusión de garantías",
          bloques: [
            p('En la máxima medida permitida por la ley aplicable, el sitio web, los productos digitales y los servicios se proporcionan "según disponibilidad" y de acuerdo con las descripciones proporcionadas al momento de la compra.'),
            p("MimiMMDArt no otorga garantías que no estén expresamente indicadas en la página del producto o de la comisión correspondiente."),
            p("Nada en esta sección elimina garantías o protecciones al consumidor que no puedan excluirse legalmente."),
          ],
        },
        {
          titulo: "25. Limitación de responsabilidad",
          bloques: [
            p("En la máxima medida permitida por la ley, MimiMMDArt no será responsable por pérdidas indirectas, incidentales, especiales, consecuentes o similares resultantes del uso o la imposibilidad de usar el sitio web o los archivos digitales."),
            p("Cuando lo permita la ley, la responsabilidad total de MimiMMDArt relacionada con un pedido individual no excederá el monto efectivamente pagado a MimiMMDArt por ese pedido en particular."),
            p("Esta limitación no aplica cuando la ley aplicable no permita limitar la responsabilidad."),
          ],
        },
        {
          titulo: "26. Indemnización del cliente",
          bloques: [
            p("En la medida permitida por la ley, el cliente acepta ser responsable de reclamos, daños o gastos resultantes de:"),
            ul([
              "Material que el cliente proporcionó sin los derechos necesarios.",
              "El uso ilegal del cliente de los archivos entregados.",
              "La redistribución o reventa no autorizada de archivos por parte del cliente.",
              "La violación por parte del cliente de derechos de propiedad intelectual de terceros.",
              "Fraude o uso indebido intencional del sitio web.",
            ]),
            p("Esta sección no hace responsable al cliente de una falta cometida únicamente por MimiMMDArt."),
          ],
        },
        {
          titulo: "27. Reclamos de derechos de autor y propiedad intelectual",
          bloques: [
            p("MimiMMDArt respeta los derechos de propiedad intelectual."),
            p("Si un titular de derechos considera que el contenido disponible a través de MimiMMDArt infringe sus derechos, puede contactar a Mimi Support con información suficiente para identificar:"),
            ul(["La obra protegida.", "El contenido presuntamente infractor.", "La ubicación del contenido en el sitio web.", "Su información de contacto.", "La base de sus derechos."]),
            p("MimiMMDArt puede eliminar o restringir contenido mientras se revisa un reclamo legítimo de propiedad intelectual."),
          ],
        },
        {
          titulo: "28. Privacidad",
          bloques: [
            p("El uso de la información personal también se rige por la Política de Privacidad de MimiMMDArt."),
            p("Los clientes deben revisar la Política de Privacidad para entender cómo se maneja la información relacionada con cuentas, pedidos, comunicaciones, pagos y uso del sitio web."),
          ],
        },
        {
          titulo: "29. Cambios a estos Términos",
          bloques: [
            p("MimiMMDArt puede actualizar estos Términos y Condiciones cuando sea necesario."),
            p("La versión actual y su fecha de actualización se mostrarán en el sitio web."),
            p("A menos que la ley exija lo contrario, un pedido generalmente seguirá sujeto a la versión de los Términos aceptada al momento de realizar ese pedido."),
            p("El uso continuado del sitio web después de que nuevos Términos entren en vigencia constituye la aceptación de los Términos actualizados para el uso futuro del servicio."),
          ],
        },
        {
          titulo: "30. Divisibilidad",
          bloques: [
            p("Si una parte de estos Términos se considera inválida o inaplicable, las secciones restantes seguirán vigentes en la medida permitida por la ley."),
            p("La disposición inválida se interpretará lo más cerca posible, legalmente, de su propósito original."),
          ],
        },
        {
          titulo: "31. Sin renuncia de derechos",
          bloques: [p("Si MimiMMDArt no hace cumplir de inmediato una disposición de estos Términos, eso no significa que MimiMMDArt renuncie permanentemente al derecho de hacerla cumplir más adelante.")],
        },
        {
          titulo: "32. Ley aplicable",
          bloques: [
            p("En la medida permitida por la ley aplicable, estos Términos y cualquier disputa relacionada con MimiMMDArt se regirán por las leyes aplicables al lugar de establecimiento de MimiMMDArt."),
            p("Las leyes obligatorias de protección al consumidor aplicables al país o jurisdicción del cliente no quedan excluidas cuando no puedan renunciarse legalmente."),
          ],
        },
        {
          titulo: "33. Contacto",
          bloques: [
            p("Las preguntas, problemas con pedidos, inquietudes sobre derechos de autor y demás solicitudes relacionadas con estos Términos deben enviarse a través de Mimi Support o de la información de contacto oficial que aparece en MimiMMDArt.com."),
            p("Al comprar en MimiMMDArt, enviar una solicitud de comisión, crear una cuenta o descargar un producto comprado, confirmas que has leído y aceptas estos Términos y Condiciones."),
          ],
        },
      ],
    },
  },
};

interface LegalPageProps {
  documento: "privacidad" | "terminos";
}

export const LegalPage: React.FC<LegalPageProps> = ({ documento }) => {
  const { i18n, t } = useTranslation();
  const lang = i18n.language.startsWith("en") ? "en" : "es";
  const doc = CONTENIDO[documento][lang];

  return (
    <div className="bg-background text-on-surface min-h-screen">
      <div className="max-w-[720px] mx-auto px-gutter py-12 md:py-16 flex flex-col gap-8">
        <Link
          to="/"
          className="self-start text-on-surface-variant hover:text-primary flex items-center gap-1 no-underline text-sm"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          {t("common.backHome", "Volver al inicio")}
        </Link>

        <header className="flex flex-col gap-2 border-b border-outline-variant/20 pb-6">
          <h1 className="text-3xl md:text-4xl font-bold">{doc.titulo}</h1>
          <p className="text-on-surface-variant text-sm font-mono">{doc.actualizado}</p>
          <p className="text-on-surface-variant mt-2 leading-relaxed">{doc.intro}</p>
        </header>

        <div className="flex flex-col gap-8">
          {doc.secciones.map((seccion) => (
            <section key={seccion.titulo} className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-on-surface">{seccion.titulo}</h2>
              {seccion.bloques.map((bloque, i) =>
                bloque.tipo === "p" ? (
                  <p key={i} className="text-on-surface-variant leading-relaxed">
                    {bloque.texto}
                  </p>
                ) : (
                  <ul key={i} className="list-disc pl-5 flex flex-col gap-1.5">
                    {bloque.items.map((item, j) => (
                      <li key={j} className="text-on-surface-variant leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                )
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};
