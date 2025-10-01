from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    page.goto("http://localhost:5173")

    # Wait for the app to load
    page.wait_for_selector("h1")

    # Define the selector for the input field
    input_selector = '[name="title"]'

    # Wait for the input field to be visible and enabled
    page.wait_for_selector(input_selector, state='visible')
    page.wait_for_selector(input_selector, state='enabled')

    # Add a new todo to trigger enter animation
    page.locator(input_selector).fill("New Todo Item")
    page.get_by_role('button', name='Add').click()

    # Wait for the animation to complete
    page.wait_for_timeout(1000)
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)