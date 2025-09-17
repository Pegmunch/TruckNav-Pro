# Chinese Android App Store Requirements

## Tencent MyApp (腾讯应用宝)
**Store URL**: https://sj.qq.com/

### Requirements
- **Company Registration**: Chinese business license required
- **App Classification**: Transportation & Navigation category
- **Content Review**: 3-5 business days
- **Package Format**: APK (signed)
- **Size Limit**: 200MB maximum
- **Age Rating**: 4+ (suitable for truck drivers)

### Submission Checklist
- [ ] Chinese business license (营业执照)
- [ ] App description in Simplified Chinese
- [ ] Screenshots (5 minimum, various screen sizes)
- [ ] Privacy policy in Chinese
- [ ] Terms of service in Chinese
- [ ] Software copyright certificate (软件著作权)
- [ ] ICP filing number (if applicable)

### Technical Requirements
- No Google Play Services
- Tencent Analytics integration recommended
- WeChat sharing capability (optional)
- Support for Chinese coordinate system (GCJ-02)

---

## Huawei AppGallery (华为应用市场)
**Store URL**: https://appgallery.huawei.com/

### Requirements
- **HMS Core Integration**: Required for location services
- **Huawei Developer Account**: Individual or enterprise
- **Content Review**: 1-3 business days
- **Package Format**: APK (HMS-compatible)
- **Map Services**: Huawei Map Kit (instead of Google Maps)

### Submission Checklist
- [ ] Huawei Developer account verification
- [ ] HMS Core SDK integration
- [ ] Huawei Map Kit implementation
- [ ] App description in Chinese and English
- [ ] Privacy policy compliance with Huawei guidelines
- [ ] Age rating: Everyone/Teen/Mature
- [ ] Category: Travel & Local

### HMS Core Services to Integrate
- **Location Kit**: For GPS and navigation
- **Map Kit**: For mapping functionality
- **Analytics Kit**: For app usage analytics
- **Push Kit**: For notifications

---

## Xiaomi GetApps (小米应用商店)
**Store URL**: https://app.mi.com/

### Requirements
- **MIUI Optimization**: Recommended for better performance
- **Developer Account**: Free registration
- **Content Review**: 2-3 business days
- **Package Format**: APK (standard Android)
- **Size Limit**: 100MB recommended

### Submission Checklist
- [ ] Xiaomi Developer account
- [ ] App tested on MIUI devices
- [ ] Description in Simplified Chinese
- [ ] App icon (192x192, 512x512)
- [ ] Screenshots for various MIUI versions
- [ ] MIUI-specific permission descriptions

### MIUI Optimizations
- Battery optimization whitelist
- Notification channel setup
- MIUI-specific permission handling
- Adaptive icon support

---

## Baidu Mobile Assistant (百度手机助手)
**Store URL**: https://shouji.baidu.com/

### Requirements
- **Baidu Developer Account**: Enterprise preferred
- **Content Review**: 3-7 business days
- **Package Format**: APK
- **Map Integration**: Baidu Maps preferred
- **Analytics**: Baidu Mobile Analytics

### Submission Checklist
- [ ] Baidu Developer account (企业开发者账号)
- [ ] Baidu Maps SDK integration
- [ ] App description and keywords in Chinese
- [ ] Baidu Analytics implementation
- [ ] Software copyright registration
- [ ] Category: Travel & Transportation

### Baidu Service Integration
- **Baidu Maps**: Primary mapping service
- **Baidu Analytics**: User behavior tracking  
- **Baidu Push**: Notification services
- **Baidu Location**: GPS and positioning

---

## Common Requirements for All Chinese Stores

### Legal Documents
1. **Business License** (营业执照)
2. **Software Copyright Certificate** (软件著作权)
3. **ICP Filing** (ICP备案) - for apps with server components
4. **Privacy Policy** in Simplified Chinese
5. **User Agreement** in Simplified Chinese

### Technical Compliance
- No Google services (Play Services, Firebase, Google Maps)
- Chinese coordinate system support (GCJ-02 vs WGS-84)
- Local server hosting recommended
- Compliance with Cybersecurity Law
- Data localization requirements

### Content Guidelines
- No prohibited content (政治敏感内容)
- Accurate app descriptions
- Appropriate age ratings
- Proper categorization
- Chinese language support

### Localization Requirements
- **Language**: Simplified Chinese mandatory
- **Currency**: Chinese Yuan (CNY) for any payments
- **Time Zone**: China Standard Time (CST)
- **Cultural Adaptation**: Local traffic rules and regulations
- **Units**: Metric system preferred

## Estimated Timeline

### Pre-Submission (2-4 weeks)
- Legal document preparation
- Technical integration
- Content localization
- App testing

### Submission Process (1-2 weeks)
- Store submission
- Review process
- Potential revisions
- Final approval

### Post-Launch (Ongoing)
- Performance monitoring
- User feedback response
- Regular updates
- Compliance maintenance

## Cost Considerations

### Developer Account Fees
- **Tencent**: Free registration, per-app review fees
- **Huawei**: Free for individual, paid for enterprise features
- **Xiaomi**: Free registration
- **Baidu**: Free registration, enterprise verification fee

### Additional Costs
- Software copyright registration: ~1,000-3,000 RMB
- Legal document translation: ~500-2,000 RMB per document
- Technical integration services: Variable
- Compliance consulting: ~5,000-15,000 RMB

## Success Tips

1. **Start Early**: Legal document preparation takes time
2. **Use Local Services**: Replace Google services with Chinese alternatives
3. **Test Thoroughly**: Each store has specific device requirements
4. **Maintain Compliance**: Regular updates for policy changes
5. **Engage Community**: Chinese users appreciate local support
6. **Monitor Performance**: Use store-provided analytics tools