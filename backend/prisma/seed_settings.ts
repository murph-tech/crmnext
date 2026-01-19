import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding company settings...');

    const settings = [
        { key: 'company_name_th', value: 'บริษัท เมิร์ฟเทคโนโลยี จำกัด' },
        { key: 'company_name_en', value: 'MURPH TECHNOLOGY CO.,LTD.' },
        { key: 'company_address_th', value: '69/43 หมู่ที่ 3 ตำบลบางใหญ่ อำเภอบางใหญ่ จ.นนทบุรี 11140' },
        { key: 'company_address_en', value: '69/43 Moo 3, Bang Yai, Bang Yai District, Nonthaburi 11140' },
        { key: 'company_tax_id', value: '0105567026446' },
        { key: 'company_phone', value: '086-588-9024' },
        { key: 'company_email', value: 'murph@murphtechnology.com' },
        { key: 'company_logo', value: '/images/logo.png' } // Placeholder
    ];

    for (const setting of settings) {
        await prisma.systemSetting.upsert({
            where: { key: setting.key },
            update: { value: JSON.stringify(setting.value) },
            create: {
                key: setting.key,
                value: JSON.stringify(setting.value)
            }
        });
    }

    console.log('✅ Company settings seeded!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
