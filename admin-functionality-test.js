// Functionality Test - Run in Browser Console
// This script tests all admin modules for proper functionality

const adminModuleTests = {
  // Test Analytics Module
  testAnalytics: () => {
    const timeRangeButtons = document.querySelectorAll('button')
    const hasWeek = Array.from(timeRangeButtons).some(b => b.textContent.includes('Week'))
    const hasMonth = Array.from(timeRangeButtons).some(b => b.textContent.includes('Month'))
    const hasYear = Array.from(timeRangeButtons).some(b => b.textContent.includes('Year'))
    
    return {
      module: 'Analytics',
      status: hasWeek && hasMonth && hasYear ? '✅ PASS' : '❌ FAIL',
      features: {
        timeRangeFilters: hasWeek && hasMonth && hasYear,
        metricsDisplay: !!document.querySelector('h3')?.textContent?.includes('Key Metrics') || !!document.querySelector('[role="heading"]'),
        charts: !!document.querySelector('table'),
        exportButton: !!document.querySelector('button')?.textContent?.includes('Export')
      }
    }
  },

  // Test Clients Module
  testClients: () => {
    const searchInput = document.querySelector('input[placeholder*="Search"]')
    const selectFilter = document.querySelector('select')
    const table = document.querySelector('table')
    
    return {
      module: 'Clients',
      status: (searchInput && selectFilter && table) ? '✅ PASS' : '❌ FAIL',
      features: {
        searchFunctionality: !!searchInput,
        statusFilter: !!selectFilter,
        clientsTable: !!table,
        actionButtons: !!document.querySelector('[role="cell"] button')
      }
    }
  },

  // Test Finance Module
  testFinance: () => {
    const tabs = Array.from(document.querySelectorAll('button')).filter(b => 
      b.textContent.includes('Invoices') || b.textContent.includes('Expenses') || b.textContent.includes('Payments')
    )
    const tables = document.querySelectorAll('table')
    
    return {
      module: 'Finance',
      status: (tabs.length >= 2 && tables.length > 0) ? '✅ PASS' : '❌ FAIL',
      features: {
        tabbedInterface: tabs.length >= 2,
        invoicesTable: !!document.querySelector('table'),
        dataDisplay: tables.length > 0,
        actionButtons: !!document.querySelector('button')?.textContent?.includes('New Invoice')
      }
    }
  },

  // Test Content Module
  testContent: () => {
    const contentTabs = Array.from(document.querySelectorAll('button')).filter(b =>
      b.textContent.includes('Portfolio') || b.textContent.includes('Services') || b.textContent.includes('FAQ')
    )
    
    return {
      module: 'Content',
      status: (contentTabs.length >= 2) ? '✅ PASS' : '❌ FAIL',
      features: {
        tabbedInterface: contentTabs.length >= 2,
        portfolioCards: !!document.querySelector('div[class*="grid"]'),
        managementTools: !!document.querySelector('button')?.textContent?.includes('Add New'),
        contentDisplay: !!document.querySelector('[class*="bg-gradient"]')
      }
    }
  },

  // Test Reports Module
  testReports: () => {
    const filterButtons = Array.from(document.querySelectorAll('button')).filter(b =>
      b.textContent.includes('All Events') || b.textContent.includes('Orders') || b.textContent.includes('Payments')
    )
    const table = document.querySelector('table')
    
    return {
      module: 'Reports',
      status: (filterButtons.length >= 2 && table) ? '✅ PASS' : '❌ FAIL',
      features: {
        logFilters: filterButtons.length >= 2,
        eventsTable: !!table,
        statusIndicators: !!document.querySelector('[class*="bg-green"]') || !!document.querySelector('[class*="bg-red"]'),
        exportOption: !!document.querySelector('button')?.textContent?.includes('Export')
      }
    }
  },

  // Test Settings Module
  testSettings: () => {
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea')
    const toggleButtons = document.querySelectorAll('button[class*="text-2xl"]')
    const formSections = document.querySelectorAll('h3')
    
    return {
      module: 'Settings',
      status: (inputs.length > 0 && toggleButtons.length > 0) ? '✅ PASS' : '❌ FAIL',
      features: {
        formInputs: inputs.length > 0,
        toggleControls: toggleButtons.length > 0,
        securitySection: !!Array.from(formSections).some(h => h.textContent.includes('Security')),
        saveButton: !!document.querySelector('button')?.textContent?.includes('Save')
      }
    }
  },

  // Test Dashboard Navigation
  testNavigation: () => {
    const sidebar = document.querySelector('[class*="bg-gradient-to-b"]')
    const navLinks = document.querySelectorAll('a[href*="/admin"]')
    
    return {
      module: 'Navigation',
      status: (navLinks.length > 5) ? '✅ PASS' : '❌ FAIL',
      features: {
        sidebarVisible: !!sidebar,
        navigationLinks: navLinks.length,
        allModulesLinked: navLinks.length >= 8
      }
    }
  },

  // Run All Tests
  runAll: function() {
    console.log('🧪 ADMIN MODULE FUNCTIONALITY TESTS\n')
    console.log('=' .repeat(50))
    
    const tests = [
      this.testAnalytics(),
      this.testClients(),
      this.testFinance(),
      this.testContent(),
      this.testReports(),
      this.testSettings(),
      this.testNavigation()
    ]
    
    tests.forEach(test => {
      console.log(`\n${test.status} ${test.module}`)
      console.log('-'.repeat(40))
      Object.entries(test.features).forEach(([feature, status]) => {
        console.log(`  ${status ? '✓' : '✗'} ${feature}`)
      })
    })
    
    const passed = tests.filter(t => t.status.includes('✅')).length
    console.log('\n' + '='.repeat(50))
    console.log(`\n📊 SUMMARY: ${passed}/${tests.length} modules functional`)
    console.log(passed === tests.length ? '\n✅ ALL TESTS PASSED!' : '\n⚠️ Some tests failed')
  }
}

// Run tests
adminModuleTests.runAll()
